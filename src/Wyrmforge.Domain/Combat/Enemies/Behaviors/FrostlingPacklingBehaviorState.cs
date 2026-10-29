using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum FrostlingPhase
{
    Circle,
    Windup,
    Skitter,
    Recover,
}

/// <summary>
/// Frostling Packling (Frost roster 01). Where the Ashling mob rushes and the Mire Hound stalks alone, Packlings box the
/// hunter in: each one holds its own slot on a slowly turning ring (Pack Circle), so a pack surrounds rather than chases.
/// From the ring a Packling makes a short, low Skitter Lunge behind a brief crouch, and its Hamstring Bite chills. Chilled
/// prey is what the pack waits for: lunges come twice as often and bite harder, so the counterplay is to stay warm and
/// break the ring before it closes — the Don't Starve hound-circle read, with a Frost twist.
/// </summary>
public sealed class FrostlingPacklingBehaviorState(int id)
{
    public const double CircleRadius = 92;
    public const double CircleDriftRadiansPerSecond = 0.55;
    public const double InitialCooldownSeconds = 1.3;
    public const double WindupSeconds = 0.4;
    public const double SkitterSeconds = 0.22;
    public const double SkitterDistance = 100;
    public const double LungeRange = 135;
    public const double RecoverSeconds = 0.55;
    public const double CooldownSeconds = 3.2;
    public const double ChilledCooldownMultiplier = 0.5;
    public const double BiteDamage = 6;
    public const double ChilledBiteMultiplier = 1.75;
    public const int BiteChill = 1;
    private const double GoldenAngle = 2.399963229728653;

    /// <summary>The Packling's own place on the ring; neighbours never share one, so the circle has no gap to slip through.</summary>
    public double SlotAngle { get; } = id * GoldenAngle;

    public int DriftSign { get; } = id % 2 == 0 ? 1 : -1;

    public FrostlingPhase Phase { get; private set; } = FrostlingPhase.Circle;

    public double PhaseRemaining { get; private set; }

    // Staggered so a fresh pack never lunges in unison.
    public double CooldownRemaining { get; private set; } = InitialCooldownSeconds + id % 3 * 0.45;

    public Vector2D LungeDirection { get; private set; } = Vector2D.Zero;

    public Vector2D LungeOrigin { get; private set; } = Vector2D.Zero;

    public bool BiteLanded { get; private set; }

    public bool IsCommitted => Phase is FrostlingPhase.Windup or FrostlingPhase.Skitter;

    public double WindupProgress => Phase == FrostlingPhase.Windup ? Math.Clamp(1 - PhaseRemaining / WindupSeconds, 0, 1) : 0;

    public static double SkitterSpeed => SkitterDistance / SkitterSeconds;

    public Vector2D LungeEnd => LungeOrigin + LungeDirection * SkitterDistance;

    /// <summary>Advances the loop. Chilled prey shortens the wait between lunges. Returns true on the frame a crouch begins.</summary>
    public bool Tick(double delta, Vector2D position, Vector2D target, bool preyChilled, bool mayCommit = true)
    {
        if (Phase != FrostlingPhase.Circle)
        {
            PhaseRemaining -= delta;
            if (PhaseRemaining > 0) return false;
            switch (Phase)
            {
                case FrostlingPhase.Windup:
                    Enter(FrostlingPhase.Skitter, SkitterSeconds);
                    break;
                case FrostlingPhase.Skitter:
                    Enter(FrostlingPhase.Recover, RecoverSeconds);
                    break;
                default:
                    Enter(FrostlingPhase.Circle, 0);
                    break;
            }
            return false;
        }

        CooldownRemaining = Math.Max(0, CooldownRemaining - delta * (preyChilled ? 1 / ChilledCooldownMultiplier : 1));
        if (CooldownRemaining > 0 || !mayCommit || Vector2D.Distance(position, target) > LungeRange) return false;
        LungeDirection = Vector2D.DirectionTo(position, target);
        if (LungeDirection == Vector2D.Zero) LungeDirection = new Vector2D(DriftSign, 0);
        LungeOrigin = position;
        BiteLanded = false;
        CooldownRemaining = CooldownSeconds;
        Enter(FrostlingPhase.Windup, WindupSeconds);
        return true;
    }

    /// <summary>Hamstring Bite damage: chilled prey is punished.</summary>
    public static double BiteDamageAgainst(bool preyChilled) => BiteDamage * (preyChilled ? ChilledBiteMultiplier : 1);

    /// <summary>The bite connected: the lunge ends and the Packling is exposed before it rejoins the ring.</summary>
    public void Land()
    {
        if (Phase != FrostlingPhase.Skitter) return;
        BiteLanded = true;
        Enter(FrostlingPhase.Recover, RecoverSeconds);
    }

    /// <summary>A shove during the crouch carries the locked lane with it, so the drawn telegraph stays truthful.</summary>
    public void Displace(Vector2D offset)
    {
        if (Phase == FrostlingPhase.Windup) LungeOrigin += offset;
    }

    /// <summary>This Packling's slot on the slowly turning ring around the hunter.</summary>
    public Vector2D CirclePoint(Vector2D target, double seconds)
    {
        var angle = SlotAngle + DriftSign * seconds * CircleDriftRadiansPerSecond;
        return Wyrmforge.Domain.Combat.Behaviors.CreatureDecisions.SurroundSlot(target, CircleRadius, angle);
    }

    private void Enter(FrostlingPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }
}
