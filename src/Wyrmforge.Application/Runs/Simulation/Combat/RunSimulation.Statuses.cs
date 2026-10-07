using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private ProjectileStatusEffect? CreateProjectileStatus(SpellDefinition spell, int rank)
    {
        var status = spell.Ability.Status;
        if (status is null) return null;
        var evolution = EvolutionProfile(spell.Id);
        return new ProjectileStatusEffect(
            status.Status,
            status.CalculateDurationSeconds(rank) * evolution.StatusDurationMultiplier,
            status.Stacks + evolution.BonusStatusStacks);
    }

    private void ApplyAbilityStatus(SpellDefinition spell, int rank, ICombatTarget target)
    {
        if (spell.Ability.Status is not { } status) return;
        var evolution = EvolutionProfile(spell.Id);
        var duration = status.CalculateDurationSeconds(rank) * evolution.StatusDurationMultiplier;
        for (var stack = 0; stack < status.Stacks + evolution.BonusStatusStacks; stack++) ApplyStatus(target, status.Status, duration);
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
