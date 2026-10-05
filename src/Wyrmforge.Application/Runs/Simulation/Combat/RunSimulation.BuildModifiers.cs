using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Progression.RunUpgrades;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private BuildModifierSet buildModifiers = BuildModifierSet.Empty;

    private void RefreshBuildModifiers(bool healMaximumHealthIncrease = false)
    {
        var previousMaxHealth = player.MaxHealth;
        buildModifiers = BuildModifierSet.Aggregate(ActiveBuildModifierProfiles());
        player.MaxHealth = buildModifiers.Apply(BuildStatId.MaxHealth, passiveProfile.MaxHealth);
        if (healMaximumHealthIncrease && player.MaxHealth > previousMaxHealth)
        {
            player.Health = Math.Min(player.MaxHealth, player.Health + player.MaxHealth - previousMaxHealth);
            return;
        }
        player.Health = Math.Min(player.Health, player.MaxHealth);
    }

    private IEnumerable<BuildModifierProfile?> ActiveBuildModifierProfiles()
    {
        foreach (var upgrade in RunUpgradeCatalog.All)
        {
            var rank = build.RunUpgrades[upgrade.Id];
            if (rank > 0) yield return upgrade.ProfileForRank(rank);
        }
        foreach (var relic in build.Relics.Equipped) yield return RelicCatalog.Get(relic).Modifiers;
        foreach (var essence in build.DragonEssences.Selected) yield return DragonEssenceCatalog.Get(essence).Modifiers;
    }

    private IReadOnlyList<CombatRuleDefinition> ResolveBuildRules(CombatRuleContext context) => CombatRuleResolver.Resolve(buildModifiers.Rules, context);
}
