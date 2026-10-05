using Wyrmforge.Domain.Combat.Projectiles;
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

    private void ApplyAbilityStatus(SpellDefinition spell, int rank, ICombatTarget target)
    {
        if (spell.Ability.Status is not { } status) return;
        for (var stack = 0; stack < status.Stacks; stack++) ApplyStatus(target, status.Status, status.CalculateDurationSeconds(rank));
    }

    private void ApplyProjectileStatus(ProjectileState projectile, ICombatTarget target)
    {
        if (projectile.Status is not { } status) return;
        for (var stack = 0; stack < status.Stacks; stack++) ApplyStatus(target, status.Status, status.DurationSeconds);
    }

    private bool ApplyStatusDamage(ICombatTarget target, double delta)
    {
        var damagePerSecond = target.Statuses.DamagePerSecond();
        return damagePerSecond > 0 && DamageTarget(target, damagePerSecond * delta);
    }
}
