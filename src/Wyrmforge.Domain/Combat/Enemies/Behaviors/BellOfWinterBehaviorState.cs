using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum BellOfWinterPhase
{
    Advance,
    Windup,
    Recover,
    /// <summary>Half health: the bell rimes over. A staggered free window, then Deep Winter.</summary>
    Rime,
}

public enum BellOfWinterMove
{
    /// <summary>Permafrost Slam: a crater, then lasting frozen scars radiating from it.</summary>
    Slam,
    /// <summary>Winter Toll: expanding freezing rings from the bell, each with open lanes to step through.</summary>
    Toll,
    /// <summary>Icicle Recall: the shards in the scars, and one over the hunter, are called down from above.</summary>
    Recall,
}

public enum BellOfWinterEvent
{
    None,
    WindupStarted,
    Slammed,
    Tolled,
    Recalled,
    RimeStarted,
    RimeCompleted,
}

/// <summary>
/// The Bell of Winter, Rimeclaw's lair-road set piece (Frost F4b). Where the Fire Bell Warden pressures with lanes and a rally of
/// reinforcements, the winter bell boxes the hunter in: its slam leaves scars of permafrost that stay on the ground, its toll
/// sends rings that only open where the lanes are, and its recall turns the scars it left into a rain of marked icicles before
/// clearing them. It never calls reinforcements. Every move is slow to tell and followed by a long recovery: panic and greed are
/// both punished. At half health it rimes over (a free window), then Deep Winter widens every move.
/// The simulation owns the ground, rings and icicles; this state decides what is swung, where and when.
/// </summary>
public sealed class BellOfWinterBehaviorState
{
    public const double OpeningSeconds = 2.0;
    public const double SlamWindupSeconds = 1.3;
    public const double TollWindupSeconds = 1.1;
    public const double RecallWindupSeconds = 1.4;
    public const double SlamRecoverSeconds = 2.2;
    public const double TollRecoverSeconds = 1.6;
    public const double RecallRecoverSeconds = 1.9;
    public const double GapSeconds = 1.3;
    public const double DeepWinterGapSeconds = 0.9;
    public const double RimeSeconds = 2.0;
    public const double RimeHealthFraction = 0.5;
    /// <summary>Beyond this the bell tolls instead of slamming: its rings reach where its arm cannot.</summary>
    public const double SlamRange = 260;
    public const double SlamMinimumReach = 60;
    public const double SlamMaximumReach = 140;
    public const int TollRings = 3;
    public const int DeepWinterTollRings = 4;
    public const int TollGaps = 3;
    /// <summary>Half the angular width of each open lane in a toll ring.</summary>
    public const double TollGapHalfRadians = 17 * Math.PI / 180;
    public const int SlamScars = 3;
    public const int DeepWinterSlamScars = 4;

    private static readonly BellOfWinterMove[] Cycle = [BellOfWinterMove.Slam, BellOfWinterMove.Toll, BellOfWinterMove.Slam, BellOfWinterMove.Recall];

    private int moveIndex;

    public BellOfWinterPhase Phase { get; private set; } = BellOfWinterPhase.Advance;

    public double PhaseRemaining { get; private set; }

    public double GapRemaining { get; private set; } = OpeningSeconds;

    public BellOfWinterMove Move { get; private set; }

    /// <summary>Slam: the crater centre. Recall: where the hunter stood at the tell. Fixed when the move is chosen.</summary>
    public Vector2D Target { get; private set; } = Vector2D.Zero;

    /// <summary>The direction toward the hunter at the tell; scars and toll lanes are laid out around it.</summary>
    public Vector2D Facing { get; private set; } = new(1, 0);

    public bool DeepWinter { get; private set; }

    public int MovesCompleted { get; private set; }

    public bool IsCommitted => Phase == BellOfWinterPhase.Windup;

    public double WindupProgress => Phase == BellOfWinterPhase.Windup ? Math.Clamp(1 - PhaseRemaining / WindupSeconds(Move), 0, 1) : 0;

    public double RimeProgress => Phase == BellOfWinterPhase.Rime ? Math.Clamp(1 - PhaseRemaining / RimeSeconds, 0, 1) : DeepWinter ? 1 : 0;

    public int RingCount => DeepWinter ? DeepWinterTollRings : TollRings;

    public int ScarCount => DeepWinter ? DeepWinterSlamScars : SlamScars;

    /// <summary>
    /// The open lanes of toll ring <paramref name="ring"/>, as angles. The first ring opens toward and away from the hunter's
    /// sides, never straight at them; each later ring turns half a lane-step, so running straight out never works twice.
    /// </summary>
    public IReadOnlyList<double> TollGapAngles(int ring)
    {
        var step = 2 * Math.PI / TollGaps;
        var start = Math.Atan2(Facing.Y, Facing.X) + step / 2 + ring * step / 2;
        return [.. Enumerable.Range(0, TollGaps).Select(index => NormalizeAngle(start + index * step))];
    }

    /// <summary>The directions of the scars a slam leaves, fanned evenly with the first one toward the hunter.</summary>
    public IReadOnlyList<Vector2D> ScarDirections
    {
        get
        {
            var step = 2 * Math.PI / ScarCount;
            var start = Math.Atan2(Facing.Y, Facing.X);
            return [.. Enumerable.Range(0, ScarCount).Select(index => new Vector2D(Math.Cos(start + index * step), Math.Sin(start + index * step)))];
        }
    }

    public static bool InGap(double angle, IReadOnlyList<double> gaps) =>
        gaps.Any(gap => Math.Abs(NormalizeAngle(angle - gap)) <= TollGapHalfRadians);

    public static double WindupSeconds(BellOfWinterMove move) => move switch
    {
        BellOfWinterMove.Slam => SlamWindupSeconds,
        BellOfWinterMove.Toll => TollWindupSeconds,
        _ => RecallWindupSeconds,
    };

    public static double RecoverSeconds(BellOfWinterMove move) => move switch
    {
        BellOfWinterMove.Slam => SlamRecoverSeconds,
        BellOfWinterMove.Toll => TollRecoverSeconds,
        _ => RecallRecoverSeconds,
    };

    /// <summary>Starts the half-health rime at most once; also called from the damage path so a frozen bell still rimes.</summary>
    public bool TryBeginRime(double health, double maxHealth)
    {
        if (DeepWinter || Phase == BellOfWinterPhase.Rime || health > maxHealth * RimeHealthFraction) return false;
        Enter(BellOfWinterPhase.Rime, RimeSeconds);
        return true;
    }

    public BellOfWinterEvent Tick(double delta, Vector2D position, double health, double maxHealth, Vector2D hunter)
    {
        if (Phase == BellOfWinterPhase.Rime)
        {
            PhaseRemaining -= delta;
            if (PhaseRemaining > 0) return BellOfWinterEvent.None;
            DeepWinter = true;
            GapRemaining = DeepWinterGapSeconds;
            Enter(BellOfWinterPhase.Advance, 0);
            return BellOfWinterEvent.RimeCompleted;
        }
        if (TryBeginRime(health, maxHealth)) return BellOfWinterEvent.RimeStarted;
        switch (Phase)
        {
            case BellOfWinterPhase.Windup:
                PhaseRemaining -= delta;
                if (PhaseRemaining > 0) return BellOfWinterEvent.None;
                MovesCompleted++;
                GapRemaining = DeepWinter ? DeepWinterGapSeconds : GapSeconds;
                Enter(BellOfWinterPhase.Recover, RecoverSeconds(Move));
                return Move switch
                {
                    BellOfWinterMove.Slam => BellOfWinterEvent.Slammed,
                    BellOfWinterMove.Toll => BellOfWinterEvent.Tolled,
                    _ => BellOfWinterEvent.Recalled,
                };
            case BellOfWinterPhase.Recover:
                PhaseRemaining -= delta;
                if (PhaseRemaining <= 0) Enter(BellOfWinterPhase.Advance, 0);
                return BellOfWinterEvent.None;
            default:
                GapRemaining -= delta;
                if (GapRemaining > 0) return BellOfWinterEvent.None;
                var distance = Vector2D.Distance(position, hunter);
                Move = Cycle[moveIndex++ % Cycle.Length];
                if (Move == BellOfWinterMove.Slam && distance > SlamRange) Move = BellOfWinterMove.Toll;
                var toward = Vector2D.DirectionTo(position, hunter);
                Facing = toward == Vector2D.Zero ? new Vector2D(1, 0) : toward;
                Target = Move == BellOfWinterMove.Recall ? hunter : position + Facing * Math.Clamp(distance, SlamMinimumReach, SlamMaximumReach);
                Enter(BellOfWinterPhase.Windup, WindupSeconds(Move));
                return BellOfWinterEvent.WindupStarted;
        }
    }

    /// <summary>A dragging, chained walk toward the hunter, only between swings.</summary>
    public double SpeedMultiplier => Phase == BellOfWinterPhase.Advance ? 1 : 0;

    private void Enter(BellOfWinterPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }

    private static double NormalizeAngle(double angle)
    {
        angle %= 2 * Math.PI;
        if (angle > Math.PI) angle -= 2 * Math.PI;
        if (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }
}
