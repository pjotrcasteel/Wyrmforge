using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private const double HitFlashSeconds = 0.09;
    private const double SplashPulseSeconds = 0.2;

    private void UpdateCombatFeedback(double delta)
    {
        foreach (var id in hitFlashRemaining.Keys.ToArray())
        {
            var remaining = hitFlashRemaining[id] - delta;
            if (remaining <= 0) hitFlashRemaining.Remove(id);
            else hitFlashRemaining[id] = remaining;
        }

        foreach (var pulse in splashPulses) pulse.Life -= delta;
        splashPulses.RemoveAll(pulse => pulse.Life <= 0);
    }

    private void RegisterTargetHit(ICombatTarget target)
    {
        if (target is EnemyState) hitFlashRemaining[target.Id] = HitFlashSeconds;
    }

    private void RegisterSplashPulse(Vector2D position, double radius) => splashPulses.Add(new SplashPulseState(position, radius, SplashPulseSeconds));

    private sealed class SplashPulseState(Vector2D position, double radius, double duration)
    {
        public Vector2D Position { get; } = position;

        public double Radius { get; } = radius;

        public double Duration { get; } = duration;

        public double Life { get; set; } = duration;

        public double Progress => 1 - Math.Clamp(Life / Duration, 0, 1);
    }
}
