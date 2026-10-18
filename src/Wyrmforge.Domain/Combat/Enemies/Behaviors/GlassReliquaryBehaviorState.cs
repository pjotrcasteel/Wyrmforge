using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum GlassReliquaryRite
{
    CrystalWard,
    Veil,
    Prison,
}

public enum GlassReliquaryEvent
{
    None,
    CastStarted,
    WardRaised,
    VeilCast,
    PrisonCast,
    VeilFaded,
    ShatterStarted,
    ShatterCompleted,
}

/// <summary>
/// Frost F4c: the Reliquary of Glass. The Fire Reliquary pressures (wards empower the pack, corruption burns the floor); this one
/// boxes the hunter in. Crystal Wards tether light beams to it, the Refraction Veil hides it among false forms, and Glacial Prisons
/// rise around where the hunter stands. Every rite has a readable cast and a recovery after it. Striking the true body through the
/// veil breaks it and exposes the caster (the Hollow Knight "find the real one" beat); at half health the glass shatters into a
/// denser second ritual. The simulation owns pylons, false forms and cages; this state only decides what is cast and when.
/// All numbers are provisional until the final balancing pass.
/// </summary>
public sealed class GlassReliquaryBehaviorState
{
    public const double OpeningSeconds = 1.6;
    public const double WardCastSeconds = 1.2;
    public const double VeilCastSeconds = 1;
    public const double PrisonCastSeconds = 0.9;
    public const double RecoverSeconds = 1.2;
    public const double FirstRitualGapSeconds = 2.2;
    public const double SecondRitualGapSeconds = 1.6;
    public const double ShatterSeconds = 2;
    public const double ShatterHealthFraction = 0.5;
    public const double VeilSeconds = 7;
    public const double ExposedSeconds = 1.8;
    public const double MinimumRange = 220;
    public const double MaximumRange = 340;

    private static readonly GlassReliquaryRite[] FirstRitual =
        [GlassReliquaryRite.CrystalWard, GlassReliquaryRite.Prison, GlassReliquaryRite.Veil, GlassReliquaryRite.Prison];

    private static readonly GlassReliquaryRite[] SecondRitual =
        [GlassReliquaryRite.CrystalWard, GlassReliquaryRite.Veil, GlassReliquaryRite.Prison, GlassReliquaryRite.Prison, GlassReliquaryRite.Veil,
            GlassReliquaryRite.Prison];

    private int riteIndex;

    public ReliquaryPhase Phase { get; private set; } = ReliquaryPhase.Advance;

    public double PhaseRemaining { get; private set; }

    public double GapRemaining { get; private set; } = OpeningSeconds;

    public GlassReliquaryRite Rite { get; private set; }

    /// <summary>True once the shatter has finished: the second, denser ritual is running.</summary>
    public bool Shifted { get; private set; }

    public bool IsVeiled => VeilRemaining > 0;

    public double VeilRemaining { get; private set; }

    /// <summary>True during the stagger after the veil is broken by a hit on the true body.</summary>
    public bool Exposed { get; private set; }

    public int RitesCompleted { get; private set; }

    public int VeilsCast { get; private set; }

    public int VeilsBroken { get; private set; }

    public bool IsCasting => Phase == ReliquaryPhase.Cast;

    public double CastProgress => Phase == ReliquaryPhase.Cast ? Math.Clamp(1 - PhaseRemaining / CastSeconds(Rite), 0, 1) : 0;

    public double ShiftProgress => Phase == ReliquaryPhase.Shift ? Math.Clamp(1 - PhaseRemaining / ShatterSeconds, 0, 1) : Shifted ? 1 : 0;

    public double ExposedProgress => Exposed ? Math.Clamp(1 - PhaseRemaining / ExposedSeconds, 0, 1) : 0;

    /// <summary>False forms per veil: two, three once the glass has shattered.</summary>
    public int FalseForms => Shifted ? 3 : 2;

    public static double CastSeconds(GlassReliquaryRite rite) => rite switch
    {
        GlassReliquaryRite.CrystalWard => WardCastSeconds,
        GlassReliquaryRite.Veil => VeilCastSeconds,
        _ => PrisonCastSeconds,
    };

    /// <param name="canRaiseWard">False while the pylon cap is reached; the ward rite is skipped rather than wasted.</param>
    public GlassReliquaryEvent Tick(double delta, double health, double maxHealth, bool canRaiseWard)
    {
        if (Phase == ReliquaryPhase.Shift)
        {
            PhaseRemaining -= delta;
            if (PhaseRemaining > 0) return GlassReliquaryEvent.None;
            Shifted = true;
            riteIndex = 0;
            GapRemaining = SecondRitualGapSeconds;
            Enter(ReliquaryPhase.Advance, 0);
            return GlassReliquaryEvent.ShatterCompleted;
        }
        if (!Shifted && health <= maxHealth * ShatterHealthFraction)
        {
            // The shatter cancels a rite in progress and drops the veil: nothing half-cast lands during the warning.
            VeilRemaining = 0;
            Exposed = false;
            Enter(ReliquaryPhase.Shift, ShatterSeconds);
            return GlassReliquaryEvent.ShatterStarted;
        }
        if (VeilRemaining > 0)
        {
            VeilRemaining = Math.Max(0, VeilRemaining - delta);
            if (VeilRemaining <= 0) return GlassReliquaryEvent.VeilFaded;
        }
        switch (Phase)
        {
            case ReliquaryPhase.Cast:
                PhaseRemaining -= delta;
                if (PhaseRemaining > 0) return GlassReliquaryEvent.None;
                RitesCompleted++;
                GapRemaining = Shifted ? SecondRitualGapSeconds : FirstRitualGapSeconds;
                Enter(ReliquaryPhase.Recover, RecoverSeconds);
                switch (Rite)
                {
                    case GlassReliquaryRite.CrystalWard:
                        return GlassReliquaryEvent.WardRaised;
                    case GlassReliquaryRite.Veil:
                        VeilRemaining = VeilSeconds;
                        VeilsCast++;
                        return GlassReliquaryEvent.VeilCast;
                    default:
                        return GlassReliquaryEvent.PrisonCast;
                }
            case ReliquaryPhase.Recover:
                PhaseRemaining -= delta;
                if (PhaseRemaining > 0) return GlassReliquaryEvent.None;
                Exposed = false;
                Enter(ReliquaryPhase.Advance, 0);
                return GlassReliquaryEvent.None;
            default:
                GapRemaining -= delta;
                if (GapRemaining > 0) return GlassReliquaryEvent.None;
                Rite = NextRite(canRaiseWard);
                Enter(ReliquaryPhase.Cast, CastSeconds(Rite));
                return GlassReliquaryEvent.CastStarted;
        }
    }

    /// <summary>
    /// A hit on the true body while veiled: the veil breaks, any rite in progress is lost and the caster staggers. Returns false
    /// when there was no veil to break.
    /// </summary>
    public bool BreakVeil()
    {
        if (!IsVeiled || Phase == ReliquaryPhase.Shift) return false;
        VeilRemaining = 0;
        VeilsBroken++;
        Exposed = true;
        Enter(ReliquaryPhase.Recover, ExposedSeconds);
        return true;
    }

    /// <summary>Holds a long casting distance and never steps in while committed to a rite.</summary>
    public (Vector2D Direction, double SpeedMultiplier) Movement(Vector2D position, Vector2D hunter) =>
        Phase != ReliquaryPhase.Advance ? (Vector2D.Zero, 0) : KeepRange(position, hunter);

    /// <summary>The range-keeping drift shared by the true body and its false forms, so the forms never give it away by moving.</summary>
    public static (Vector2D Direction, double SpeedMultiplier) KeepRange(Vector2D position, Vector2D hunter)
    {
        var distance = Vector2D.Distance(position, hunter);
        var toward = Vector2D.DirectionTo(position, hunter);
        if (distance < MinimumRange) return (toward * -1, 0.9);
        if (distance > MaximumRange) return (toward, 1);
        return (Vector2D.Zero, 0);
    }

    private GlassReliquaryRite NextRite(bool canRaiseWard)
    {
        var ritual = Shifted ? SecondRitual : FirstRitual;
        for (var attempt = 0; attempt < ritual.Length; attempt++)
        {
            var rite = ritual[riteIndex++ % ritual.Length];
            if (rite == GlassReliquaryRite.CrystalWard && !canRaiseWard) continue;
            // One veil at a time: a second would only reshuffle the same forms.
            if (rite == GlassReliquaryRite.Veil && IsVeiled) continue;
            return rite;
        }
        return GlassReliquaryRite.Prison;
    }

    private void Enter(ReliquaryPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }
}

/// <summary>A mirrored false form: it drifts like the true body and breaks in one hit. Left standing, it becomes a prison.</summary>
public sealed class GlassFalseFormState
{
    /// <summary>Set when the veil ends or the form is struck, so it leaves the field exactly once.</summary>
    public bool Released { get; set; }
}
