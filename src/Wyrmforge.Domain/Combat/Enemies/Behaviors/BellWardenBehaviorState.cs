using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum BellWardenPhase
{
    Advance,
    Windup,
    Recover,
    Crack,
}

public enum BellWardenMove
{
    Smash,
    Toll,
    Rally,
}

public enum BellWardenEvent
{
    None,
    WindupStarted,
    Smashed,
    Tolled,
    Rallied,
    CrackStarted,
    CrackCompleted,
}

/// <summary>
/// The Bell Warden's set-piece cycle (encounter brief §3, §9). Three readable moves, one at a time: the bell smash (a 1.15s
/// raised-bell tell, a marked crater, then a delayed shockwave ring), the toll (a reverberating line of ground blasts down a
/// lane chosen at the tell) and the rally call (a ring of sound that brings a bounded handful of reinforcements). Every move is
/// followed by a long recovery: the Hollow Knight / Hades boss rhythm where the opening after a big commitment is the reward
/// for reading the tell. At half health the bell cracks: a staggered free window, then wider tolls and shorter gaps.
/// The simulation owns positions, blasts and spawns; this state only decides what is being swung and when.
/// </summary>
public sealed class BellWardenBehaviorState
{
    public const double OpeningSeconds = 1.8;
    public const double SmashWindupSeconds = 1.15;
    public const double TollWindupSeconds = 1.0;
    public const double RallyWindupSeconds = 1.3;
    public const double SmashRecoverSeconds = 1.9;
    public const double TollRecoverSeconds = 1.4;
    public const double RallyRecoverSeconds = 1.6;
    public const double GapSeconds = 1.4;
    public const double CrackedGapSeconds = 1.0;
    public const double CrackSeconds = 1.8;
    public const double CrackHealthFraction = 0.5;
    /// <summary>The smash only starts when the hunter is this close; further away the Warden tolls instead.</summary>
    public const double SmashRange = 230;
    public const double SmashMinimumReach = 60;
    public const double SmashMaximumReach = 130;
    public const double CrackedTollSpreadRadians = 25 * Math.PI / 180;

    private static readonly BellWardenMove[] Cycle = [BellWardenMove.Smash, BellWardenMove.Toll, BellWardenMove.Smash, BellWardenMove.Rally];

    private int moveIndex;

    public BellWardenPhase Phase { get; private set; } = BellWardenPhase.Advance;

    public double PhaseRemaining { get; private set; }

    public double GapRemaining { get; private set; } = OpeningSeconds;

    public BellWardenMove Move { get; private set; }

    /// <summary>Smash: the crater centre, fixed when the bell is raised. Toll: the lane direction, fixed at the tell.</summary>
    public Vector2D Target { get; private set; } = Vector2D.Zero;

    public Vector2D TollDirection { get; private set; } = new(1, 0);

    /// <summary>True once the bell has cracked at half health: wider tolls, shorter gaps, same recoveries.</summary>
    public bool Cracked { get; private set; }

    public int MovesCompleted { get; private set; }

    public bool IsCommitted => Phase == BellWardenPhase.Windup;

    public double WindupProgress => Phase == BellWardenPhase.Windup ? Math.Clamp(1 - PhaseRemaining / WindupSeconds(Move), 0, 1) : 0;

    public double CrackProgress => Phase == BellWardenPhase.Crack ? Math.Clamp(1 - PhaseRemaining / CrackSeconds, 0, 1) : Cracked ? 1 : 0;

    /// <summary>The lanes a toll travels down: one, or a three-lane fan once cracked.</summary>
    public IReadOnlyList<Vector2D> TollLanes => Cracked
        ? [TollDirection, Rotate(TollDirection, -CrackedTollSpreadRadians), Rotate(TollDirection, CrackedTollSpreadRadians)]
        : [TollDirection];

    public static double WindupSeconds(BellWardenMove move) => move switch
    {
        BellWardenMove.Smash => SmashWindupSeconds,
        BellWardenMove.Toll => TollWindupSeconds,
        _ => RallyWindupSeconds,
    };

    public static double RecoverSeconds(BellWardenMove move) => move switch
    {
        BellWardenMove.Smash => SmashRecoverSeconds,
        BellWardenMove.Toll => TollRecoverSeconds,
        _ => RallyRecoverSeconds,
    };

    /// <summary>
    /// Starts the half-health crack at most once. Also called from the damage path, so a frozen or stunned Warden that is not
    /// ticking still cracks the moment it reaches half health.
    /// </summary>
    public bool TryBeginCrack(double health, double maxHealth)
    {
        if (Cracked || Phase == BellWardenPhase.Crack || health > maxHealth * CrackHealthFraction) return false;
        // The crack cancels a swing in progress and staggers the Warden: a free window, never a surprise hit.
        Enter(BellWardenPhase.Crack, CrackSeconds);
        return true;
    }

    /// <param name="canRally">False while the reinforcement cap is reached; the rally is replaced by a toll, never wasted.</param>
    public BellWardenEvent Tick(double delta, Vector2D position, double health, double maxHealth, Vector2D hunter, bool canRally)
    {
        if (Phase == BellWardenPhase.Crack)
        {
            PhaseRemaining -= delta;
            if (PhaseRemaining > 0) return BellWardenEvent.None;
            Cracked = true;
            GapRemaining = CrackedGapSeconds;
            Enter(BellWardenPhase.Advance, 0);
            return BellWardenEvent.CrackCompleted;
        }
        if (TryBeginCrack(health, maxHealth)) return BellWardenEvent.CrackStarted;
        switch (Phase)
        {
            case BellWardenPhase.Windup:
                PhaseRemaining -= delta;
                if (PhaseRemaining > 0) return BellWardenEvent.None;
                MovesCompleted++;
                GapRemaining = Cracked ? CrackedGapSeconds : GapSeconds;
                Enter(BellWardenPhase.Recover, RecoverSeconds(Move));
                return Move switch
                {
                    BellWardenMove.Smash => BellWardenEvent.Smashed,
                    BellWardenMove.Toll => BellWardenEvent.Tolled,
                    _ => BellWardenEvent.Rallied,
                };
            case BellWardenPhase.Recover:
                PhaseRemaining -= delta;
                if (PhaseRemaining <= 0) Enter(BellWardenPhase.Advance, 0);
                return BellWardenEvent.None;
            default:
                GapRemaining -= delta;
                if (GapRemaining > 0) return BellWardenEvent.None;
                Move = NextMove(Vector2D.Distance(position, hunter), canRally);
                var toward = Vector2D.DirectionTo(position, hunter);
                TollDirection = toward == Vector2D.Zero ? new Vector2D(1, 0) : toward;
                Target = position + TollDirection * Math.Clamp(Vector2D.Distance(position, hunter), SmashMinimumReach, SmashMaximumReach);
                Enter(BellWardenPhase.Windup, WindupSeconds(Move));
                return BellWardenEvent.WindupStarted;
        }
    }

    /// <summary>A slow, heavy walk toward the hunter, only while not committed to a swing.</summary>
    public double SpeedMultiplier => Phase == BellWardenPhase.Advance ? 1 : 0;

    private BellWardenMove NextMove(double distance, bool canRally)
    {
        var move = Cycle[moveIndex++ % Cycle.Length];
        if (move == BellWardenMove.Smash && distance > SmashRange) return BellWardenMove.Toll;
        return move == BellWardenMove.Rally && !canRally ? BellWardenMove.Toll : move;
    }

    private void Enter(BellWardenPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }

    private static Vector2D Rotate(Vector2D vector, double radians) =>
        new(vector.X * Math.Cos(radians) - vector.Y * Math.Sin(radians), vector.X * Math.Sin(radians) + vector.Y * Math.Cos(radians));
}
