using Wyrmforge.Domain.Combat.Abilities;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private static ProjectileStatusEffect? CreateProjectileStatus(SpellDefinition spell, int rank)
    {
        var status = spell.Ability.Status;
        return status is null ? null : new ProjectileStatusEffect(status.Status, status.CalculateDurationSeconds(rank), status.Stacks);
    }

    private static void ApplyAbilityStatus(SpellDefinition spell, int rank, ICombatTarget target)
    {
        if (spell.Ability.Status is not { } status) return;
        ApplyStatus(target, status.Status, status.CalculateDurationSeconds(rank), status.Stacks);
    }

    private static void ApplyProjectileStatus(ProjectileState projectile, ICombatTarget target)
    {
        if (projectile.Status is not { } status) return;
        ApplyStatus(target, status.Status, status.DurationSeconds, status.Stacks);
    }

    private static void ApplyStatus(ICombatTarget target, CombatStatusId status, double durationSeconds, int stacks = 1)
    {
        var definition = CombatStatusCatalog.Get(status);
        var duration = target is Domain.Combat.Dragons.DragonState ? durationSeconds * definition.BossDurationMultiplier : durationSeconds;
        target.Statuses.Apply(definition, duration, stacks);
    }

    private bool ApplyStatusDamage(ICombatTarget target, double delta)
    {
        var damagePerSecond = target.Statuses.DamagePerSecond();
        return damagePerSecond > 0 && DamageTarget(target, damagePerSecond * delta);
    }
}
