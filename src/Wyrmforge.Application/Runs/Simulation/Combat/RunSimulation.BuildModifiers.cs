using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Progression.Refinements;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private BuildModifierSet buildModifiers = BuildModifierSet.Empty;
    private BuildModifierSet runUpgradeModifiers = BuildModifierSet.Empty;

    private void RefreshBuildModifiers(bool healMaximumHealthIncrease = false)
    {
        var previousMaxHealth = player.MaxHealth;
        var runProfiles = ActiveRunUpgradeModifierProfiles().Concat(ActiveRefinementModifierProfiles()).ToArray();
        runUpgradeModifiers = BuildModifierSet.Aggregate(runProfiles);
        // Damage, cast speed, projectile speed and defence are already baked into passiveProfile.
        // Only the mutation-specific Web stats belong in this independent modifier pipeline.
        buildModifiers = BuildModifierSet.Aggregate([.. runProfiles, .. ActiveEquippedModifierProfiles(),
            .. ActiveResonanceModifierProfiles(), .. ActiveWebMutationModifierProfiles()]);
        player.MaxHealth = buildModifiers.Apply(BuildStatId.MaxHealth, passiveProfile.MaxHealth);
        if (healMaximumHealthIncrease && player.MaxHealth > previousMaxHealth)
        {
            player.Health = Math.Min(player.MaxHealth, player.Health + player.MaxHealth - previousMaxHealth);
            return;
        }
        player.Health = Math.Min(player.Health, player.MaxHealth);
    }

    private IEnumerable<BuildModifierProfile> ActiveWebMutationModifierProfiles()
    {
        foreach (var id in learnedPassiveNodeIds)
        {
            var node = PassiveTreeCatalog.Get(id);
            if (node.Requirement is not null) continue;
            var stats = node.Modifiers.Stats.Where(modifier => modifier.Stat is
                BuildStatId.MutationRadius or BuildStatId.MutationDuration or BuildStatId.BurnDamage).ToArray();
            if (stats.Length > 0) yield return new BuildModifierProfile(stats);
        }
    }

    private IEnumerable<BuildModifierProfile> ActiveRunUpgradeModifierProfiles()
    {
        foreach (var upgrade in RunUpgradeCatalog.All)
        {
            var rank = build.RunUpgrades[upgrade.Id];
            if (rank > 0) yield return upgrade.ProfileForRank(rank);
        }
    }

    private IEnumerable<BuildModifierProfile> ActiveRefinementModifierProfiles()
    {
        foreach (var refinement in RunRefinementCatalog.All)
        {
            var rank = build.Refinements[refinement.Id];
            if (rank > 0) yield return refinement.ProfileForRank(rank);
        }
    }

    private IEnumerable<BuildModifierProfile?> ActiveEquippedModifierProfiles()
    {
        foreach (var relic in build.Relics.Equipped) yield return RelicCatalog.Get(relic).Modifiers;
        foreach (var essence in build.DragonEssences.Selected) yield return DragonEssenceCatalog.Get(essence).Modifiers;
        foreach (var mutation in ActiveLaboratoryModifierProfiles()) yield return mutation;
    }

    private IEnumerable<BuildModifierProfile> ActiveResonanceModifierProfiles() => ResonanceThresholds.Select(threshold => threshold.Modifiers);

    private IReadOnlyList<CombatRuleDefinition> ResolveBuildRules(CombatRuleContext context) => CombatRuleResolver.Resolve(buildModifiers.Rules, context);
}
