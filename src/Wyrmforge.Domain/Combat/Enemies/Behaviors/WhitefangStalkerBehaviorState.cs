using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum WhitefangPhase
{
    Prowl,
    Feint,
    Windup,
    Pounce,
    Recover,
}

public enum WhitefangEvent
{
    None,
    FeintStarted,
    WindupStarted,
}

/// <summary>
/// Whitefang Stalker (Frost roster 04). Not a recoloured Mire Hound: the hound stalks in front and pounces straight in. The
/// Whitefang prowls wide, then makes a Snowblind Feint — it kicks up a snow cloud where the hunter last saw it and darts to
/// the side the hunter is moving away from (behind their heading). Only from that flank does it crouch and Pounce, and the
/// bite's Tendon Chill lands two stacks, so the leap that catches you also slows your escape. Counterplay (concept sheet):
/// watch the posture, keep side angles safe, punish the long recovery after the leap.
/// </summary>
public sealed class WhitefangStalkerBehaviorState(int side = 1)
{
    public const double ProwlDistance = 190;
    public const double ProwlDriftRadians = 0.35;
    public const double ProwlSpeedMultiplier = 1.1;
    public const double FlankDistance = 150;
    public const double FeintRange = 300;
    public const double FeintSeconds = 0.3;
    public const double MaxFeintSpeed = 720;
    public const double InitialCooldownSeconds = 1.6;
    public const double CooldownSeconds = 3.6;
    public const double WindupSeconds = 0.5;
    public const double PounceSeconds = 0.25;
    public const double PounceDistance = 170;
    public const double RecoverSeconds = 0.85;
    public const double PounceDamage = 10;
    public const int TendonChill = 2;
    public const double CloudRadius = 46;
    public const double CloudSeconds = 2.4;
    public const double TwinleapRecoverSeconds = 0.3;

    public int Side { get; } = side >= 0 ? 1 : -1;

    public WhitefangPhase Phase { get; private set; } = WhitefangPhase.Prowl;

    public double PhaseRemaining { get; private set; }

    public double CooldownRemaining { get; private set; } = InitialCooldownSeconds;

    public Vector2D FeintTarget { get; private set; } = Vector2D.Zero;

    public Vector2D PounceOrigin { get; private set; } = Vector2D.Zero;

    public Vector2D PounceDirection { get; private set; } = Vector2D.Zero;

    public bool PounceLanded { get; private set; }

    /// <summary>Twinfang elite: one more crouch and leap straight after the first, re-aimed at wherever the hunter went.</summary>
    public bool Twinleap { get; set; }

    private bool secondLeapReady;

    public bool IsCommitted => Phase is WhitefangPhase.Feint or WhitefangPhase.Windup or WhitefangPhase.Pounce;

    public double WindupProgress => Phase == WhitefangPhase.Windup ? Math.Clamp(1 - PhaseRemaining / WindupSeconds, 0, 1) : 0;

    public static double PounceSpeed => PounceDistance / PounceSeconds;

    public Vector2D PounceEnd => PounceOrigin + PounceDirection * PounceDistance;

    public WhitefangEvent Tick(double delta, Vector2D position, Vector2D target, Vector2D heading, bool mayCommit = true)
    {
        if (Phase == WhitefangPhase.Prowl)
        {
            CooldownRemaining = Math.Max(0, CooldownRemaining - delta);
            if (CooldownRemaining > 0 || !mayCommit || Vector2D.Distance(position, target) > FeintRange) return WhitefangEvent.None;
            FeintTarget = FlankPoint(position, target, heading);
            PounceLanded = false;
            secondLeapReady = Twinleap;
            CooldownRemaining = CooldownSeconds;
            Enter(WhitefangPhase.Feint, FeintSeconds);
            return WhitefangEvent.FeintStarted;
        }

        PhaseRemaining -= delta;
        if (PhaseRemaining > 0) return WhitefangEvent.None;
        switch (Phase)
        {
            case WhitefangPhase.Feint:
                // The lane is locked the moment it surfaces on the flank: the hunter has the crouch to step off it.
                PounceOrigin = position;
                PounceDirection = Vector2D.DirectionTo(position, target);
                if (PounceDirection == Vector2D.Zero) PounceDirection = new Vector2D(Side, 0);
                Enter(WhitefangPhase.Windup, WindupSeconds);
                return WhitefangEvent.WindupStarted;
            case WhitefangPhase.Windup:
                Enter(WhitefangPhase.Pounce, PounceSeconds);
                break;
            case WhitefangPhase.Pounce:
                Enter(WhitefangPhase.Recover, AfterPounceSeconds);
                break;
            case WhitefangPhase.Recover when secondLeapReady:
                secondLeapReady = false;
                PounceLanded = false;
                PounceOrigin = position;
                PounceDirection = Vector2D.DirectionTo(position, target);
                if (PounceDirection == Vector2D.Zero) PounceDirection = new Vector2D(Side, 0);
                Enter(WhitefangPhase.Windup, WindupSeconds);
                return WhitefangEvent.WindupStarted;
            default:
                Enter(WhitefangPhase.Prowl, 0);
                break;
        }
        return WhitefangEvent.None;
    }

    /// <summary>
    /// Where the feint ends: behind the hunter's heading, offset to this Whitefang's side. A standing hunter has no "behind",
    /// so the Stalker swings a quarter turn around them instead.
    /// </summary>
    public Vector2D FlankPoint(Vector2D position, Vector2D target, Vector2D heading)
    {
        var away = Vector2D.DirectionTo(target, position);
        if (away == Vector2D.Zero) away = new Vector2D(Side, 0);
        var behind = heading == Vector2D.Zero
            ? Vector2D.Rotate(away, Side * Math.PI / 2)
            : Vector2D.Rotate(heading * -1, Side * 0.45);
        return target + behind * FlankDistance;
    }

    /// <summary>Wide prowl: keep a long distance and drift sideways, so the Whitefang is rarely where the hunter is facing.</summary>
    public Vector2D ProwlPoint(Vector2D position, Vector2D target)
    {
        var away = Vector2D.DirectionTo(target, position);
        if (away == Vector2D.Zero) away = new Vector2D(Side, 0);
        return target + Vector2D.Rotate(away, Side * ProwlDriftRadians) * ProwlDistance;
    }

    /// <summary>The leap connected: Tendon Chill lands and the Stalker is exposed.</summary>
    public void Land()
    {
        if (Phase != WhitefangPhase.Pounce) return;
        PounceLanded = true;
        Enter(WhitefangPhase.Recover, AfterPounceSeconds);
    }

    // A Twinfang barely lands before it gathers again; the long exposed recovery comes after the second leap.
    private double AfterPounceSeconds => secondLeapReady ? TwinleapRecoverSeconds : RecoverSeconds;

    /// <summary>A shove during the crouch carries the locked lane with it, so the drawn telegraph stays truthful.</summary>
    public void Displace(Vector2D offset)
    {
        if (Phase == WhitefangPhase.Windup) PounceOrigin += offset;
    }

    private void Enter(WhitefangPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }
}
