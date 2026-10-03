using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Depth;

public sealed class RunDepthRiftState
{
    public const double Radius = 74;
    public const double Damage = 28;
    public const double TelegraphSeconds = 1.1;
    public const double InitialDelaySeconds = 3.2;
    public const double IntervalSeconds = 6.5;

    private const double TimerEpsilon = 1e-9;
    private double cooldown = InitialDelaySeconds;

    public Vector2D Position { get; private set; } = Vector2D.Zero;

    public double TelegraphRemaining { get; private set; }

    public bool IsTelegraphing => TelegraphRemaining > TimerEpsilon;

    public bool Tick(double delta, bool enabled, Vector2D targetPosition)
    {
        delta = Math.Max(0, delta);
        if (!enabled)
        {
            Reset();
            return false;
        }

        if (IsTelegraphing)
        {
            TelegraphRemaining = Math.Max(0, TelegraphRemaining - delta);
            if (TelegraphRemaining > TimerEpsilon) return false;
            TelegraphRemaining = 0;
            cooldown = IntervalSeconds;
            return true;
        }

        cooldown = Math.Max(0, cooldown - delta);
        if (cooldown > TimerEpsilon) return false;
        cooldown = 0;
        Position = targetPosition;
        TelegraphRemaining = TelegraphSeconds;
        return false;
    }

    private void Reset()
    {
        cooldown = InitialDelaySeconds;
        TelegraphRemaining = 0;
    }
}
