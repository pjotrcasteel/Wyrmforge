using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum MireHoundPhase
{
    Stalk,
    Windup,
    Pounce,
    Recover,
    Retreat,
}

/// <summary>
/// Mire Hound flank-and-pounce loop (encounter brief §3): circle at the edge of the hunter's space, crouch for a readable
/// 0.5s with the lane already locked, commit a fixed-length pounce that cannot re-aim, then stand exposed before
/// disengaging. Like a Hades Wringer or Monster Hunter Jagras, the threat is the commit and the reward is its recovery.
/// </summary>
public sealed class MireHoundBehaviorState(int orbitSign = 1)
{
    public const double InitialCooldownSeconds = 1.4;
    public const double WindupSeconds = 0.5;
    public const double PounceSeconds = 0.3;
    public const double RecoverSeconds = 0.65;
    public const double RetreatSeconds = 0.55;
    public const double CooldownSeconds = 2.6;
    public const double StalkRadius = 140;
    public const double PounceDistance = 150;
    public const double PounceRange = 170;
    public const double PounceDamage = 15;
    public const double StalkSpeedMultiplier = 1.1;
    private const double OrbitStepRadians = 0.7;

    public int OrbitSign { get; } = orbitSign >= 0 ? 1 : -1;

    public MireHoundPhase Phase { get; private set; } = MireHoundPhase.Stalk;

    public double PhaseRemaining { get; private set; }

    public double CooldownRemaining { get; private set; } = InitialCooldownSeconds;

    public Vector2D PounceDirection { get; private set; } = Vector2D.Zero;

    public Vector2D PounceOrigin { get; private set; } = Vector2D.Zero;

    public bool PounceLanded { get; private set; }

    /// <summary>Windup and pounce count against the encounter's concurrent committed-threat cap.</summary>
    public bool IsCommitted => Phase is MireHoundPhase.Windup or MireHoundPhase.Pounce;

    public double WindupProgress => Phase == MireHoundPhase.Windup ? Math.Clamp(1 - PhaseRemaining / WindupSeconds, 0, 1) : 0;

    /// <summary>World speed of the committed pounce: a fixed lane, so the telegraph shows exactly where it ends.</summary>
    public static double PounceSpeed => PounceDistance / PounceSeconds;

    public Vector2D PounceEnd => PounceOrigin + PounceDirection * PounceDistance;

    /// <summary>Advances the loop. Returns true on the frame a windup begins.</summary>
    public bool Tick(double delta, Vector2D position, Vector2D target, bool mayCommit = true)
    {
        if (Phase != MireHoundPhase.Stalk)
        {
            PhaseRemaining -= delta;
            if (PhaseRemaining > 0) return false;
            switch (Phase)
            {
                case MireHoundPhase.Windup:
                    Enter(MireHoundPhase.Pounce, PounceSeconds);
                    break;
                case MireHoundPhase.Pounce:
                    Enter(MireHoundPhase.Recover, RecoverSeconds);
                    break;
                case MireHoundPhase.Recover:
                    Enter(MireHoundPhase.Retreat, RetreatSeconds);
                    break;
                default:
                    Enter(MireHoundPhase.Stalk, 0);
                    break;
            }
            return false;
        }

        CooldownRemaining = Math.Max(0, CooldownRemaining - delta);
        if (CooldownRemaining > 0 || !mayCommit || Vector2D.Distance(position, target) > PounceRange) return false;
        PounceDirection = Vector2D.DirectionTo(position, target);
        if (PounceDirection == Vector2D.Zero) PounceDirection = new Vector2D(OrbitSign, 0);
        PounceOrigin = position;
        PounceLanded = false;
        CooldownRemaining = CooldownSeconds;
        Enter(MireHoundPhase.Windup, WindupSeconds);
        return true;
    }

    /// <summary>The bite connected: the pounce ends at once and the hound is exposed.</summary>
    public void Land()
    {
        if (Phase != MireHoundPhase.Pounce) return;
        PounceLanded = true;
        Enter(MireHoundPhase.Recover, RecoverSeconds);
    }

    /// <summary>Next waypoint on the circling stalk: a step around the hunter on this hound's side, at stalking distance.</summary>
    public Vector2D StalkPoint(Vector2D position, Vector2D target)
    {
        var offset = position - target;
        var around = offset.Length < 1 ? new Vector2D(OrbitSign, 0) : offset.Normalized();
        return target + Vector2D.Rotate(around, OrbitSign * OrbitStepRadians) * StalkRadius;
    }

    private void Enter(MireHoundPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }
}
