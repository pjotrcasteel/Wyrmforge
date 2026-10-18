using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum ShardcasterPhase
{
    /// <summary>Planted: holds its spot while the hunter is in its band.</summary>
    Hold,
    /// <summary>Skates a short distance across the ice after every cast; it never strafes continuously.</summary>
    Glide,
    Aim,
    Recover,
}

public enum ShardcasterCast
{
    IceLance,
    BlackIce,
}

public enum ShardcasterEvent
{
    None,
    AimStarted,
    LanceReleased,
    PatchReleased,
    Interrupted,
}

/// <summary>
/// Shardcaster (Frost roster 03). Not a recoloured Ash Slinger: the slinger lobs a slow arc at a spot and strafes; the
/// Shardcaster plants itself, draws a straight lane and fires a fast Ice Lance down it. Where the lance stops — at range, a
/// wall or the hunter — a Splinter Bloom bursts a beat later, so the safe answer is to leave the lane *and* the end of it.
/// Every third cast it instead glazes the hunter's ground with Black Ice: a lingering slick patch that chills and steals
/// footing. After each cast it skates to a new spot and plants again, like a Risk of Rain Lemurian turret that relocates.
/// </summary>
public sealed class ShardcasterBehaviorState(int glideSign = 1)
{
    public const double InitialCooldownSeconds = 1.8;
    public const double AimSeconds = 0.55;
    public const double PatchAimSeconds = 0.75;
    public const double RecoverSeconds = 0.45;
    public const double GlideSeconds = 0.6;
    public const double GlideSpeedMultiplier = 1.5;
    public const double CooldownSeconds = 2.8;
    public const double MinimumRange = 200;
    public const double MaximumRange = 320;
    public const double CastRange = 400;
    public const double InterruptHealthFraction = 0.3;
    public const int PatchEvery = 3;

    public const double LanceSpeed = 560;
    public const double LanceRange = 440;
    public const double LanceHalfWidth = 7;
    public const double LanceDamage = 9;
    public const int LanceChill = 1;
    public const double BloomDelaySeconds = 0.75;
    public const double BloomRadius = 40;
    public const double BloomDamage = 8;
    public const int BloomChill = 1;
    public const double PatchRadius = 52;
    public const double PatchSeconds = 7;

    public int GlideSign { get; private set; } = glideSign >= 0 ? 1 : -1;

    public ShardcasterPhase Phase { get; private set; } = ShardcasterPhase.Hold;

    public ShardcasterCast Cast { get; private set; } = ShardcasterCast.IceLance;

    public double PhaseRemaining { get; private set; }

    public double CooldownRemaining { get; private set; } = InitialCooldownSeconds;

    public int CastsBegun { get; private set; }

    /// <summary>Locked lane direction (Ice Lance) at aim start.</summary>
    public Vector2D Aim { get; private set; } = Vector2D.Zero;

    /// <summary>Locked ground spot (Black Ice) at aim start.</summary>
    public Vector2D Target { get; private set; } = Vector2D.Zero;

    private double aimHealth;

    public bool IsCommitted => Phase == ShardcasterPhase.Aim;

    public double AimProgress => Phase == ShardcasterPhase.Aim ? Math.Clamp(1 - PhaseRemaining / AimDuration, 0, 1) : 0;

    private double AimDuration => Cast == ShardcasterCast.BlackIce ? PatchAimSeconds : AimSeconds;

    public ShardcasterEvent Tick(double delta, Vector2D position, Vector2D target, double health, double maxHealth, bool mayCommit = true)
    {
        switch (Phase)
        {
            case ShardcasterPhase.Aim:
                if (aimHealth - health >= maxHealth * InterruptHealthFraction)
                {
                    // A real burst shatters the focus: nothing is released and the caster stands open.
                    CooldownRemaining = CooldownSeconds * 0.5;
                    Enter(ShardcasterPhase.Recover, RecoverSeconds);
                    return ShardcasterEvent.Interrupted;
                }
                PhaseRemaining -= delta;
                if (PhaseRemaining > 0) return ShardcasterEvent.None;
                Enter(ShardcasterPhase.Recover, RecoverSeconds);
                return Cast == ShardcasterCast.BlackIce ? ShardcasterEvent.PatchReleased : ShardcasterEvent.LanceReleased;
            case ShardcasterPhase.Recover:
                PhaseRemaining -= delta;
                if (PhaseRemaining > 0) return ShardcasterEvent.None;
                GlideSign = -GlideSign;
                Enter(ShardcasterPhase.Glide, GlideSeconds);
                return ShardcasterEvent.None;
            case ShardcasterPhase.Glide:
                PhaseRemaining -= delta;
                if (PhaseRemaining <= 0) Enter(ShardcasterPhase.Hold, 0);
                break;
        }

        CooldownRemaining = Math.Max(0, CooldownRemaining - delta);
        if (Phase != ShardcasterPhase.Hold || CooldownRemaining > 0 || !mayCommit || Vector2D.Distance(position, target) > CastRange)
            return ShardcasterEvent.None;
        CastsBegun++;
        Cast = CastsBegun % PatchEvery == 2 ? ShardcasterCast.BlackIce : ShardcasterCast.IceLance;
        Aim = Vector2D.DirectionTo(position, target);
        if (Aim == Vector2D.Zero) Aim = new Vector2D(GlideSign, 0);
        Target = target;
        aimHealth = health;
        CooldownRemaining = CooldownSeconds;
        Enter(ShardcasterPhase.Aim, AimDuration);
        return ShardcasterEvent.AimStarted;
    }

    /// <summary>
    /// Movement intent: back away when crowded, close in when out of range, otherwise stay planted. The only sideways motion
    /// is the short skate after a cast.
    /// </summary>
    public (Vector2D Direction, double SpeedMultiplier) Movement(Vector2D position, Vector2D target)
    {
        var toward = Vector2D.DirectionTo(position, target);
        if (Phase == ShardcasterPhase.Glide) return (Vector2D.Rotate(toward, GlideSign * Math.PI / 2), GlideSpeedMultiplier);
        if (Phase != ShardcasterPhase.Hold) return (Vector2D.Zero, 0);
        var distance = Vector2D.Distance(position, target);
        if (distance < MinimumRange) return (toward * -1, 0.9);
        if (distance > MaximumRange) return (toward, 1);
        return (Vector2D.Zero, 0);
    }

    /// <summary>Where the lane ends if nothing stops the lance.</summary>
    public Vector2D LaneEnd(Vector2D origin) => origin + Aim * LanceRange;

    private void Enter(ShardcasterPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }
}
