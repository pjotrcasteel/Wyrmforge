using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Domain.Progression.Forge;

public static class ForgeGoalPlanner
{
    public static IReadOnlyList<ForgeGoal> Next(ForgeProgressionState progression, DragonEssenceVault vault, int count = 3)
    {
        ArgumentNullException.ThrowIfNull(progression);
        ArgumentNullException.ThrowIfNull(vault);
        if (count <= 0) return Array.Empty<ForgeGoal>();

        var goals = new List<ForgeGoal>();
        foreach (var discovery in ForgeDiscoveryCatalog.All)
        {
            var wyrm = WyrmName(discovery.Id);
            if (!progression.Contains(discovery.Id))
            {
                goals.Add(new ForgeGoal(discovery.Id, $"Discover {discovery.Name}",
                    $"Defeat {wyrm} and secure one of its Essences.", "Reveal a new Forge path", 0, 1, false, 2));
                continue;
            }

            var next = ForgeMasteryCatalog.For(discovery.Id).FirstOrDefault(mastery => !progression.IsForged(mastery.Id));
            if (next is null) continue;
            var progress = Math.Min(1, vault.Count(next.Cost));
            var essence = DragonEssenceCatalog.Get(next.Cost);
            goals.Add(new ForgeGoal(discovery.Id, next.Name,
                progress > 0 ? $"Ready to forge with {essence.Name}." : $"Hunt {wyrm}: extract {essence.Name}.",
                string.Join(" • ", next.Unlocks.Select(UnlockLabel)), progress, 1, progress > 0 && progression.CanForge(next.Id, vault),
                progress > 0 ? 0 : 1));
        }

        return goals.OrderBy(goal => goal.Priority).ThenBy(goal => goal.Lineage).Take(count).ToArray();
    }

    private static string WyrmName(ForgeDiscoveryId lineage) => lineage switch
    {
        ForgeDiscoveryId.Ashcraft => "Ashfang",
        ForgeDiscoveryId.Stormcraft => "Stormcoil",
        ForgeDiscoveryId.Rimecraft => "Rimeclaw",
        ForgeDiscoveryId.Voidcraft => "Voidweaver",
        _ => "a Wyrm",
    };

    private static string UnlockLabel(ForgeFeatureUnlock unlock) => unlock switch
    {
        RunOfferingUnlock offering => $"Offering: {DragonEssenceCatalog.Get(offering.EssenceId).Name}",
        SpellPoolUnlock spell => $"Spell: {SpellCatalog.Get(spell.SpellId).Name}",
        RelicPoolUnlock relic => $"Relic: {RelicCatalog.Get(relic.RelicId).Name}",
        EvolutionPoolUnlock evolution => $"Evolution: {SpellEvolutionCatalog.Get(evolution.EvolutionId).Name}",
        _ => "New Forge possibility",
    };
}
