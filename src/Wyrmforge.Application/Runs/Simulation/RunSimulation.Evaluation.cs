using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private int runSeed;

    internal void InitializeRunSeed(int seed) => runSeed = seed;

    public RunSummary CreateEvaluationSummary()
    {
        var spellLoadout = SpellCatalog.All
            .Where(spell => build.Spells[spell.Id] > 0)
            .Select(spell => new RunSpellSummary(spell.Id, build.Spells[spell.Id]))
            .ToArray();
        var upgradeLoadout = RunUpgradeCatalog.All
            .Where(upgrade => build.RunUpgrades[upgrade.Id] > 0)
            .Select(upgrade => new RunUpgradeSummary(upgrade.Id, build.RunUpgrades[upgrade.Id]))
            .ToArray();
        var relicLoadout = build.Relics.Owned
            .Select(id => new RunRelicSummary(id, build.Relics.IsEquipped(id)))
            .ToArray();
        var resonance = Resonance
            .Where(entry => entry.Value > 0)
            .Select(entry => new RunResonanceSummary(entry.School, entry.Value))
            .OrderByDescending(entry => entry.Value)
            .ThenBy(entry => entry.School)
            .ToArray();

        return CreateSummary() with
        {
            Seed = runSeed,
            CompletedRouteNodes = completedRouteNodes.Count,
            RareRouteNodes = completedRouteNodes.Count(node => node.Rarity == WyrmrealmNodeRarity.Rare),
            DragonIds = defeatedDragonIds.OrderBy(id => id).ToArray(),
            SpellLoadout = spellLoadout,
            UpgradeLoadout = upgradeLoadout,
            RelicLoadout = relicLoadout,
            Resonance = resonance,
        };
    }
}
