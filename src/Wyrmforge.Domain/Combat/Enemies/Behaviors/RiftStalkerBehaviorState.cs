using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public sealed class RiftStalkerBehaviorState
{
    public const double InitialCooldownSeconds = 1.2;
    public const double WindupSeconds = 0.65;
    public const double LungeSeconds = 0.32;
    public const double CooldownSeconds = 3;

    public double CooldownRemaining { get; private set; } = InitialCooldownSeconds;

    public double WindupRemaining { get; private set; }

    public double LungeRemaining { get; private set; }

    public Vector2D LungeDirection { get; private set; } = Vector2D.Zero;

    public bool IsWindingUp => WindupRemaining > 0;

    public bool IsLunging => LungeRemaining > 0;

    public bool Tick(double delta, Vector2D position, Vector2D targetPosition)
    {
        if (IsLunging)
        {
            LungeRemaining = Math.Max(0, LungeRemaining - delta);
            return false;
        }

        if (IsWindingUp)
        {
            WindupRemaining = Math.Max(0, WindupRemaining - delta);
            if (WindupRemaining <= 0) LungeRemaining = LungeSeconds;
            return false;
        }

        CooldownRemaining = Math.Max(0, CooldownRemaining - delta);
        if (CooldownRemaining > 0) return false;

        LungeDirection = Vector2D.DirectionTo(position, targetPosition);
        WindupRemaining = WindupSeconds;
        CooldownRemaining = CooldownSeconds;
        return true;
    }
}
