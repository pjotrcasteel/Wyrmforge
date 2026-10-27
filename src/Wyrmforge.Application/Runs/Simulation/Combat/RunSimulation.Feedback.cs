using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Damage;
using Wyrmforge.Domain.Combat.Projectiles;
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
    private readonly List<CombatWoundState> combatWounds = [];
    private long nextCombatWoundId;
    private readonly List<ExperiencePickupPulseState> experiencePickupPulses = [];

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
        foreach (var wound in combatWounds) wound.Life -= delta;
        combatWounds.RemoveAll(wound => wound.Life <= 0);
        foreach (var pickup in experiencePickupPulses) pickup.Life -= delta;
        experiencePickupPulses.RemoveAll(pickup => pickup.Life <= 0);
    }

    private void RegisterTargetHit(ICombatTarget target)
    {
        if (target is EnemyState or DragonState) hitFlashRemaining[target.Id] = HitFlashSeconds;
    }

    private void RegisterSplashPulse(Vector2D position, double radius, double duration = SplashPulseSeconds) => splashPulses.Add(new SplashPulseState(position, radius, duration));

    private void RegisterElementalImpact(Vector2D position, SpellId spell, int rank = 1, SynergyId? combination = null, bool surged = false) =>
        elementalImpacts.Add(new ElementalImpactState(position, spell, ElementalImpactSeconds + .05 * Math.Clamp(rank - 1, 0, 2),
            rank, combination, surged));

    private void RegisterCombatWound(EnemyState enemy, double damage, CombatDamageTraits traits, ProjectileState? source)
    {
        // Every decal is tied to a genuine resolved hit. Burn DoT never emits
        // fake repeated splashes; non-corporeal apparitions/constructs cannot bleed.
        if (source is null && (traits & CombatDamageTraits.Explosive) == 0) return;
        if (enemy.Kind is not (EnemyKind.Hollow or EnemyKind.MireHound or EnemyKind.Ashling or
            EnemyKind.Penitent or EnemyKind.AshSlinger or EnemyKind.AshPriest or
            EnemyKind.FrostlingPackling or EnemyKind.WhitefangStalker)) return;
        var length = source?.Velocity.Length ?? 0;
        var dx = length > .001 ? source!.Velocity.X / length : 0;
        var dy = length > .001 ? source!.Velocity.Y / length : 1;
        var severity = Math.Clamp(damage / Math.Max(1, enemy.MaxHealth), .12, 1);
        combatWounds.Add(new CombatWoundState(++nextCombatWoundId, enemy.Position, enemy.Radius,
            dx, dy, severity, enemy.Kind, traits, enemy.Health <= 0));
        while (combatWounds.Count > 48) combatWounds.RemoveAt(0);
    }

    private void RegisterEnemyDeath(EnemyState enemy, CombatDamageTraits traits = CombatDamageTraits.None)
    {
        var intensity = EnemyCatalog.Get(enemy.Kind).ThreatCost;
        var radius = enemy.Radius * (1 + Math.Max(0, intensity - 1) * 0.18);
        deathBursts.Add(new DeathBurstState(enemy.Position, radius, DeathBurstSeconds, intensity, enemy.Kind, enemy.Id, enemy.Radius, traits));
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

    private sealed class DeathBurstState(Vector2D position, double radius, double duration, int intensity, EnemyKind kind, int entityId, double bodyRadius, CombatDamageTraits traits)
    {
        public EnemyKind Kind { get; } = kind;
        public int EntityId { get; } = entityId;
        public double BodyRadius { get; } = bodyRadius;
        public CombatDamageTraits Traits { get; } = traits;

        public Vector2D Position { get; } = position;

        public double Radius { get; } = radius;

        public double Duration { get; } = duration;

        public int Intensity { get; } = intensity;

        public double Life { get; set; } = duration;

        public double Progress => 1 - Math.Clamp(Life / Duration, 0, 1);
    }

    private sealed class CombatWoundState(long id, Vector2D position, double radius, double dx,
        double dy, double severity, EnemyKind kind, CombatDamageTraits traits, bool killed)
    {
        public long Id { get; } = id;
        public Vector2D Position { get; } = position;
        public double Radius { get; } = radius;
        public double DirectionX { get; } = dx;
        public double DirectionY { get; } = dy;
        public double Severity { get; } = severity;
        public EnemyKind Kind { get; } = kind;
        public CombatDamageTraits Traits { get; } = traits;
        public bool Killed { get; } = killed;
        public double Life { get; set; } = 0.55;
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
