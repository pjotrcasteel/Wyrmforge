using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum ReliquaryPhase
{
    Advance,
    Cast,
    Recover,
    Shift,
}

public enum ReliquaryRite
{
    Ward,
    Corruption,
    Seal,
}

public enum ReliquaryEvent
{
    None,
    CastStarted,
    WardPlanted,
    CorruptionCast,
    SealCast,
    ShiftStarted,
    ShiftCompleted,
}

/// <summary>
/// The Reliquary's ritual cycle (encounter brief §3, §8). One rite at a time, each with a readable cast and a recovery
/// window afterwards (the Hades miniboss rhythm: commit, then open up). Planting a ward takes 1.1s. At half health it stops
/// everything for a 2s staged phase shift, then repeats a denser second ritual. The simulation owns positions, wards, fields
/// and blasts; this state only decides what is being cast and when.
/// </summary>
public sealed class ReliquaryBehaviorState
{
    public const double OpeningSeconds = 1.6;
    public const double WardCastSeconds = 1.1;
    public const double CorruptionCastSeconds = 0.9;
    public const double SealCastSeconds = 0.8;
    public const double RecoverSeconds = 1.3;
    public const double FirstRitualGapSeconds = 2.4;
    public const double SecondRitualGapSeconds = 1.7;
    public const double ShiftSeconds = 2;
    public const double ShiftHealthFraction = 0.5;
    public const double MinimumRange = 190;
    public const double MaximumRange = 320;

    private static readonly ReliquaryRite[] FirstRitual = [ReliquaryRite.Ward, ReliquaryRite.Corruption, ReliquaryRite.Seal, ReliquaryRite.Corruption];
    private static readonly ReliquaryRite[] SecondRitual = [ReliquaryRite.Ward, ReliquaryRite.Seal, ReliquaryRite.Corruption, ReliquaryRite.Seal, ReliquaryRite.Corruption];

    private int riteIndex;

    public ReliquaryPhase Phase { get; private set; } = ReliquaryPhase.Advance;

    public double PhaseRemaining { get; private set; }

    public double GapRemaining { get; private set; } = OpeningSeconds;

    public ReliquaryRite Rite { get; private set; }

    /// <summary>Where the hunter stood when the current rite began; corruption and seals land there, never on a later guess.</summary>
    public Vector2D CastPoint { get; private set; } = Vector2D.Zero;

    /// <summary>True once the 2s phase shift has finished: the second, denser ritual is running.</summary>
    public bool Shifted { get; private set; }

    public int RitesCompleted { get; private set; }

    public bool IsCasting => Phase == ReliquaryPhase.Cast;

    public double CastProgress => Phase == ReliquaryPhase.Cast ? Math.Clamp(1 - PhaseRemaining / CastSeconds(Rite), 0, 1) : 0;

    public double ShiftProgress => Phase == ReliquaryPhase.Shift ? Math.Clamp(1 - PhaseRemaining / ShiftSeconds, 0, 1) : Shifted ? 1 : 0;

    public static double CastSeconds(ReliquaryRite rite) => rite switch
    {
        ReliquaryRite.Ward => WardCastSeconds,
        ReliquaryRite.Corruption => CorruptionCastSeconds,
        _ => SealCastSeconds,
    };

    /// <param name="canPlantWard">False while the ward cap is reached; the ward rite is skipped rather than wasted.</param>
    public ReliquaryEvent Tick(double delta, double health, double maxHealth, Vector2D hunter, bool canPlantWard)
    {
        if (Phase == ReliquaryPhase.Shift)
        {
            PhaseRemaining -= delta;
            if (PhaseRemaining > 0) return ReliquaryEvent.None;
            Shifted = true;
            riteIndex = 0;
            GapRemaining = SecondRitualGapSeconds;
            Enter(ReliquaryPhase.Advance, 0);
            return ReliquaryEvent.ShiftCompleted;
        }
        if (!Shifted && health <= maxHealth * ShiftHealthFraction)
        {
            // The shift cancels a rite in progress: nothing half-cast lands during the warning.
            Enter(ReliquaryPhase.Shift, ShiftSeconds);
            return ReliquaryEvent.ShiftStarted;
        }
        switch (Phase)
        {
            case ReliquaryPhase.Cast:
                PhaseRemaining -= delta;
                if (PhaseRemaining > 0) return ReliquaryEvent.None;
                RitesCompleted++;
                GapRemaining = Shifted ? SecondRitualGapSeconds : FirstRitualGapSeconds;
                Enter(ReliquaryPhase.Recover, RecoverSeconds);
                return Rite switch
                {
                    ReliquaryRite.Ward => ReliquaryEvent.WardPlanted,
                    ReliquaryRite.Corruption => ReliquaryEvent.CorruptionCast,
                    _ => ReliquaryEvent.SealCast,
                };
            case ReliquaryPhase.Recover:
                PhaseRemaining -= delta;
                if (PhaseRemaining <= 0) Enter(ReliquaryPhase.Advance, 0);
                return ReliquaryEvent.None;
            default:
                GapRemaining -= delta;
                if (GapRemaining > 0) return ReliquaryEvent.None;
                Rite = NextRite(canPlantWard);
                CastPoint = hunter;
                Enter(ReliquaryPhase.Cast, CastSeconds(Rite));
                return ReliquaryEvent.CastStarted;
        }
    }

    /// <summary>Holds a casting distance like a priest, but slower and only while not committed to a rite.</summary>
    public (Vector2D Direction, double SpeedMultiplier) Movement(Vector2D position, Vector2D hunter)
    {
        if (Phase != ReliquaryPhase.Advance) return (Vector2D.Zero, 0);
        var distance = Vector2D.Distance(position, hunter);
        var toward = Vector2D.DirectionTo(position, hunter);
        if (distance < MinimumRange) return (toward * -1, 0.9);
        if (distance > MaximumRange) return (toward, 1);
        return (Vector2D.Zero, 0);
    }

    private ReliquaryRite NextRite(bool canPlantWard)
    {
        var ritual = Shifted ? SecondRitual : FirstRitual;
        var rite = ritual[riteIndex++ % ritual.Length];
        // Each ritual holds a single ward rite, so the next entry is always an attack.
        return rite == ReliquaryRite.Ward && !canPlantWard ? ritual[riteIndex++ % ritual.Length] : rite;
    }

    private void Enter(ReliquaryPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }
}

/// <summary>
/// A planted ward. It empowers minions near it until broken; left standing it eventually bursts, always behind a visible
/// fuse and a marked blast, so leaving it is a choice with a readable cost (brief §3: "ward explosion always indicated").
/// </summary>
public sealed class ReliquaryWardState
{
    public const double FuseSeconds = 13;
    public const double WarningSeconds = 3;

    public double FuseRemaining { get; private set; } = FuseSeconds;

    public bool Burst { get; private set; }

    /// <summary>0 until the last <see cref="WarningSeconds"/>, then rises to 1 as the burst approaches.</summary>
    public double WarningProgress => Math.Clamp(1 - FuseRemaining / WarningSeconds, 0, 1);

    public bool Warning => FuseRemaining <= WarningSeconds && !Burst;

    /// <summary>True exactly once, when the fuse runs out.</summary>
    public bool Tick(double delta)
    {
        if (Burst) return false;
        FuseRemaining -= delta;
        if (FuseRemaining > 0) return false;
        Burst = true;
        return true;
    }
}
