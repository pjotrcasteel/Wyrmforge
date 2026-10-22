using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;
using Wyrmforge.Domain.Spells.Synergies;

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
            FrostControlDurationModifier.Apply(spell.School, status.Status,
                status.CalculateDurationSeconds(rank) * evolution.StatusDurationMultiplier, buildModifiers),
            status.Stacks + evolution.BonusStatusStacks);
    }

    private void ApplyAbilityStatus(SpellDefinition spell, int rank, ICombatTarget target, bool firstLink = true)
    {
        if (spell.Ability.Status is { } status)
        {
            var evolution = EvolutionProfile(spell.Id);
            var duration = FrostControlDurationModifier.Apply(spell.School, status.Status,
                status.CalculateDurationSeconds(rank) * evolution.StatusDurationMultiplier, buildModifiers);
            for (var stack = 0; stack < status.Stacks + evolution.BonusStatusStacks; stack++) ApplyStatus(target, status.Status, duration);
        }
        foreach (var infusion in SpellCombinationResolver.Resolve(spell.Id, build.Spells, build.Synergies, firstLink)) ApplyStatusEffect(target, infusion);
    }

    private void ApplyProjectileStatus(ProjectileState projectile, ICombatTarget target)
    {
        if (projectile.Status is { } status) ApplyStatusEffect(target, status);
        foreach (var infusion in projectile.AdditionalStatuses) ApplyStatusEffect(target, infusion);
    }

    private void ApplyStatusEffect(ICombatTarget target, ProjectileStatusEffect status)
    {
        for (var stack = 0; stack < status.Stacks; stack++) ApplyStatus(target, status.Status, status.DurationSeconds);
    }

    private bool ApplyStatusDamage(ICombatTarget target, double delta)
    {
        var damagePerSecond = target.Statuses.DamagePerSecond();
        return damagePerSecond > 0 && DamageTarget(target, damagePerSecond * delta);
    }
}
