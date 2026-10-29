using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

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

    private const int MaxDamageNumbers = 48;
    private const double DamageNumberDuration = 0.8;
    private readonly List<DamageNumberState> damageNumbers = [];
    private long nextDamageNumberSequence;

    private void UpdateCombatFeedback(double delta)
    {
        foreach (var effect in ashfangEffects) effect.Life -= delta;
        ashfangEffects.RemoveAll(effect => effect.Life <= 0);
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
        foreach (var number in damageNumbers) number.Life -= delta;
        damageNumbers.RemoveAll(number => number.Life <= 0);
    }

    private void RegisterTargetHit(ICombatTarget target)
    {
        if (target is EnemyState or DragonState) hitFlashRemaining[target.Id] = HitFlashSeconds;
    }

    private void RegisterDamageNumber(ICombatTarget target, double amount, SpellId? spell, bool finisher, bool empowered,
        bool periodic, string? flavor = null)
    {
        if (amount <= 0) return;
        var school = SpellCatalog.Get(spell ?? build.Spells.ActiveSpell).School.ToString();
        // No synthetic crits or elemental ailments: these labels describe damage the simulation actually applied.
        var kind = flavor ?? (periodic ? "Periodic" : "Impact");
        var matching = damageNumbers.LastOrDefault(number =>
            number.TargetId == target.Id && number.IsDragon == (target is DragonState) &&
            number.School == school && number.Flavor == kind && number.Periodic == periodic && !number.Finisher &&
            number.Age <= (periodic ? 0.30 : 0.12));

        if (matching is not null)
        {
            matching.Amount += amount;
            matching.Finisher |= finisher;
            matching.Empowered |= empowered;
            return;
        }

        if (damageNumbers.Count >= MaxDamageNumbers) damageNumbers.RemoveAt(0);
        damageNumbers.Add(new DamageNumberState(++nextDamageNumberSequence, target, amount, school, kind, finisher, empowered, periodic));
    }

    private IReadOnlyList<DamageNumberRenderSnapshot> CreateDamageNumberSnapshots() =>
        damageNumbers.Select(number => new DamageNumberRenderSnapshot(number.Sequence, number.X, number.Y,
            number.Amount, number.School, number.Progress, number.Finisher, number.Empowered, number.Periodic)
            { Flavor = number.Flavor }).ToArray();

    private void RegisterSplashPulse(Vector2D position, double radius, double duration = SplashPulseSeconds) => splashPulses.Add(new SplashPulseState(position, radius, duration));

    private void RegisterElementalImpact(Vector2D position, SpellId spell, int rank = 1, SynergyId? combination = null, bool surged = false) =>
        elementalImpacts.Add(new ElementalImpactState(position, spell, ElementalImpactSeconds + .05 * Math.Clamp(rank - 1, 0, 2),
            rank, combination, surged));

    private void RegisterEnemyDeath(EnemyState enemy)
    {
        var intensity = EnemyCatalog.Get(enemy.Kind).ThreatCost;
        var radius = enemy.Radius * (1 + Math.Max(0, intensity - 1) * 0.18);
        deathBursts.Add(new DeathBurstState(enemy.Position, radius, DeathBurstSeconds, intensity, enemy.Kind, enemy.Id, enemy.Radius));
    }

    private void RegisterExperiencePickup(int value)
    {
        if (value > 0) experiencePickupPulses.Add(new ExperiencePickupPulseState(player.Position, value, ExperiencePickupPulseSeconds));
    }

    private sealed class DamageNumberState(long sequence, ICombatTarget target, double amount, string school, string flavor,
        bool finisher, bool empowered, bool periodic)
    {
        public long Sequence { get; } = sequence;
        public int TargetId { get; } = target.Id;
        public bool IsDragon { get; } = target is DragonState;
        public double X { get; } = target.Position.X;
        // Numbers originate ABOVE the shoulders so the foot-centered targeting sigil remains unobstructed.
        public double Y { get; } = target.Position.Y - Math.Min(54, target.Radius * 1.35 + 17);
        public string School { get; } = school;
        public string Flavor { get; } = flavor;
        public bool Periodic { get; } = periodic;
        public double Amount { get; set; } = amount;
        public bool Finisher { get; set; } = finisher;
        public bool Empowered { get; set; } = empowered;
        public double Life { get; set; } = DamageNumberDuration;
        public double Age => DamageNumberDuration - Life;
        public double Progress => Math.Clamp(Age / DamageNumberDuration, 0, 1);
    }

    private sealed class SplashPulseState(Vector2D position, double radius, double duration)
    {
        public Vector2D Position { get; } = position;

        public double Radius { get; } = radius;

        public double Duration { get; } = duration;

        public double Life { get; set; } = duration;

        public double Progress => 1 - Math.Clamp(Life / Duration, 0, 1);
    }

    private sealed class ElementalImpactState(Vector2D position, SpellId spell, double duration, int rank, SynergyId? combination, bool surged)
    {
        public Vector2D Position { get; } = position;

        public SpellId Spell { get; } = spell;

        public int Rank { get; } = rank;

        public SynergyId? Combination { get; } = combination;

        public bool Surge { get; } = surged;

        public double Duration { get; } = duration;

        public double Life { get; set; } = duration;

        public double Progress => 1 - Math.Clamp(Life / Duration, 0, 1);
    }

    private sealed class DeathBurstState(Vector2D position, double radius, double duration, int intensity, EnemyKind kind, int entityId, double bodyRadius)
    {
        public EnemyKind Kind { get; } = kind;
        public int EntityId { get; } = entityId;
        public double BodyRadius { get; } = bodyRadius;

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
