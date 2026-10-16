using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum PenitentPhase
{
    Guard,
    Windup,
    Recover,
}

public enum PenitentEvent
{
    None,
    WindupStarted,
    Bashed,
    GuardBroken,
}

/// <summary>
/// The Penitent's directional shield and bash (encounter brief §3): one great shield faces the hunter and turns slowly, so
/// frontal hits are blocked but a flank, a ricochet or a splash from behind lands in full. A single heavy blocked hit breaks
/// the guard. The bash winds up for 0.65s with its arc locked, then the Penitent stands shield-down and exposed - the
/// Hades shield-bearer rhythm: respect the front, punish the swing.
/// </summary>
public sealed class PenitentBehaviorState(Vector2D initialFacing)
{
    public const double TurnRadiansPerSecond = 1.6;
    public const double ShieldHalfAngleRadians = Math.PI / 3;
    public const double FrontalDamageMultiplier = 0.25;
    public const double GuardBreakHealthFraction = 0.4;
    public const double WindupSeconds = 0.65;
    public const double RecoverSeconds = 0.9;
    public const double CooldownSeconds = 2.6;
    public const double InitialCooldownSeconds = 1.2;
    public const double BashReach = 66;
    public const double BashDamage = 16;
    public const double WardDistance = 46;

    public PenitentPhase Phase { get; private set; } = PenitentPhase.Guard;

    public double PhaseRemaining { get; private set; }

    public double CooldownRemaining { get; private set; } = InitialCooldownSeconds;

    public Vector2D Facing { get; private set; } = initialFacing.Length > 0 ? initialFacing.Normalized() : new Vector2D(1, 0);

    /// <summary>Snaps the shield toward a direction; used once when the Penitent enters so it arrives facing the hunter.</summary>
    public void Face(Vector2D direction)
    {
        if (direction.Length > 0) Facing = direction.Normalized();
    }

    public bool IsCommitted => Phase == PenitentPhase.Windup;

    public bool ShieldRaised => Phase != PenitentPhase.Recover;

    public double WindupProgress => Phase == PenitentPhase.Windup ? Math.Clamp(1 - PhaseRemaining / WindupSeconds, 0, 1) : 0;

    public PenitentEvent Tick(double delta, Vector2D position, Vector2D hunter, double hunterRadius, bool mayCommit = true)
    {
        switch (Phase)
        {
            case PenitentPhase.Windup:
                PhaseRemaining -= delta;
                if (PhaseRemaining > 0) return PenitentEvent.None;
                Enter(PenitentPhase.Recover, RecoverSeconds);
                return InBashArc(position, hunter, hunterRadius) ? PenitentEvent.Bashed : PenitentEvent.None;
            case PenitentPhase.Recover:
                PhaseRemaining -= delta;
                if (PhaseRemaining <= 0) Enter(PenitentPhase.Guard, 0);
                return PenitentEvent.None;
        }

        TurnToward(Vector2D.DirectionTo(position, hunter), delta);
        CooldownRemaining = Math.Max(0, CooldownRemaining - delta);
        if (CooldownRemaining > 0 || !mayCommit || !InBashArc(position, hunter, hunterRadius)) return PenitentEvent.None;
        CooldownRemaining = CooldownSeconds;
        Enter(PenitentPhase.Windup, WindupSeconds);
        return PenitentEvent.WindupStarted;
    }

    /// <summary>Damage multiplier for a hit arriving from <paramref name="source"/>; frontal hits on a raised shield are blocked.</summary>
    public double DamageMultiplier(Vector2D position, Vector2D source)
    {
        if (!ShieldRaised) return 1;
        var from = Vector2D.DirectionTo(position, source);
        if (from == Vector2D.Zero) return 1;
        return Dot(from, Facing) >= Math.Cos(ShieldHalfAngleRadians) ? FrontalDamageMultiplier : 1;
    }

    /// <summary>A blocked hit that would still have taken 40% of the Penitent's health knocks the shield aside.</summary>
    public bool TryBreakGuard(double rawDamage, double maxHealth)
    {
        if (!ShieldRaised || rawDamage < maxHealth * GuardBreakHealthFraction) return false;
        CooldownRemaining = Math.Max(CooldownRemaining, RecoverSeconds);
        Enter(PenitentPhase.Recover, RecoverSeconds);
        return true;
    }

    /// <summary>Stand between the warded back-liner and the hunter; without a ward, advance on the hunter.</summary>
    public static Vector2D GuardPoint(Vector2D hunter, Vector2D? ward) =>
        ward is { } protectedAlly ? protectedAlly + Vector2D.DirectionTo(protectedAlly, hunter) * WardDistance : hunter;

    public bool InBashArc(Vector2D position, Vector2D hunter, double hunterRadius)
    {
        var distance = Vector2D.Distance(position, hunter);
        if (distance > BashReach + hunterRadius) return false;
        return distance <= double.Epsilon || Dot(Vector2D.DirectionTo(position, hunter), Facing) >= Math.Cos(ShieldHalfAngleRadians);
    }

    private void TurnToward(Vector2D desired, double delta)
    {
        if (desired == Vector2D.Zero || delta <= 0) return;
        var current = Math.Atan2(Facing.Y, Facing.X);
        var wanted = Math.Atan2(desired.Y, desired.X);
        var difference = Math.IEEERemainder(wanted - current, Math.PI * 2);
        var step = Math.Clamp(difference, -TurnRadiansPerSecond * delta, TurnRadiansPerSecond * delta);
        Facing = new Vector2D(Math.Cos(current + step), Math.Sin(current + step));
    }

    private static double Dot(Vector2D left, Vector2D right) => (left.X * right.X) + (left.Y * right.Y);

    private void Enter(PenitentPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }
}
