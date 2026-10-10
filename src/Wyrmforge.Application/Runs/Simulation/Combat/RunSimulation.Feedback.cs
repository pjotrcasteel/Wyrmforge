using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private const double HitFlashSeconds = 0.09;
    private const double SplashPulseSeconds = 0.2;
    private const double ElementalImpactSeconds = 0.16;
    private const double DeathBurstSeconds = 0.26;
    private const double ExperiencePickupPulseSeconds = 0.22;
    private readonly List<ElementalImpactState> elementalImpacts = [];
    private readonly List<DeathBurstState> deathBursts = [];
    private readonly List<ExperiencePickupPulseState> experiencePickupPulses = [];

    private void UpdateCombatFeedback(double delta)
    {
        powerBurstRemaining = Math.Max(0, powerBurstRemaining - delta);
        foreach (var id in hitFlashRemaining.Keys.ToArray())
        {
            var remaining = hitFlashRemaining[id] - delta;
            if (remaining <= 0) hitFlashRemaining.Remove(id);
            else hitFlashRemaining[id] = remaining;
        }

        foreach (var pulse in splashPulses) pulse.Life -= delta;
        splashPulses.RemoveAll(pulse => pulse.Life <= 0);
        foreach (var impact in elementalImpacts) impact.Life -= delta;
        elementalImpacts.RemoveAll(impact => impact.Life <= 0);
        foreach (var burst in deathBursts) burst.Life -= delta;
        deathBursts.RemoveAll(burst => burst.Life <= 0);
        foreach (var pickup in experiencePickupPulses) pickup.Life -= delta;
        experiencePickupPulses.RemoveAll(pickup => pickup.Life <= 0);
    }

    private void RegisterTargetHit(ICombatTarget target)
    {
        if (target is EnemyState) hitFlashRemaining[target.Id] = HitFlashSeconds;
    }

    private void RegisterSplashPulse(Vector2D position, double radius, double duration = SplashPulseSeconds) => splashPulses.Add(new SplashPulseState(position, radius, duration));

    private void RegisterElementalImpact(Vector2D position, SpellId spell) => elementalImpacts.Add(new ElementalImpactState(position, spell, ElementalImpactSeconds));

    private void RegisterEnemyDeath(EnemyState enemy)
    {
        var intensity = EnemyCatalog.Get(enemy.Kind).ThreatCost;
        var radius = enemy.Radius * (1 + Math.Max(0, intensity - 1) * 0.18);
        deathBursts.Add(new DeathBurstState(enemy.Position, radius, DeathBurstSeconds, intensity));
    }

    private void RegisterExperiencePickup(int value)
    {
        if (value > 0) experiencePickupPulses.Add(new ExperiencePickupPulseState(player.Position, value, ExperiencePickupPulseSeconds));
    }

    private sealed class SplashPulseState(Vector2D position, double radius, double duration)
    {
        public Vector2D Position { get; } = position;

        public double Radius { get; } = radius;

        public double Duration { get; } = duration;

        public double Life { get; set; } = duration;

        public double Progress => 1 - Math.Clamp(Life / Duration, 0, 1);
    }

    private sealed class ElementalImpactState(Vector2D position, SpellId spell, double duration)
    {
        public Vector2D Position { get; } = position;

        public SpellId Spell { get; } = spell;

        public double Duration { get; } = duration;

        public double Life { get; set; } = duration;

        public double Progress => 1 - Math.Clamp(Life / Duration, 0, 1);
    }

    private sealed class DeathBurstState(Vector2D position, double radius, double duration, int intensity)
    {
        public Vector2D Position { get; } = position;

        public double Radius { get; } = radius;

        public double Duration { get; } = duration;

        public int Intensity { get; } = intensity;

        public double Life { get; set; } = duration;

        public double Progress => 1 - Math.Clamp(Life / Duration, 0, 1);
    }

    private sealed class ExperiencePickupPulseState(Vector2D position, int value, double duration)
    {
        public Vector2D Position { get; } = position;

        public int Value { get; } = value;

        public double Duration { get; } = duration;

        public double Life { get; set; } = duration;

        public double Progress => 1 - Math.Clamp(Life / Duration, 0, 1);
    }
}
