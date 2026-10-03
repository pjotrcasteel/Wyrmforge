using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

internal sealed class BurningGroundState(Vector2D position, double damagePerTick)
{
    private const double TickEpsilon = 0.000000001;
    private double tickRemaining = TickIntervalSeconds;

    public const double Radius = 68;

    public const double DurationSeconds = 2.4;

    public const double TickIntervalSeconds = 0.3;

    public Vector2D Position { get; } = position;

    public double DamagePerTick { get; } = damagePerTick;

    public double RemainingSeconds { get; private set; } = DurationSeconds;

    public bool IsExpired => RemainingSeconds <= 0;

    public int Advance(double delta)
    {
        if (delta <= 0 || IsExpired) return 0;
        var activeDelta = Math.Min(delta, RemainingSeconds);
        RemainingSeconds = Math.Max(0, RemainingSeconds - activeDelta);
        tickRemaining -= activeDelta;
        var ticks = 0;
        while (tickRemaining <= TickEpsilon)
        {
            ticks++;
            tickRemaining += TickIntervalSeconds;
        }
        return ticks;
    }
}
