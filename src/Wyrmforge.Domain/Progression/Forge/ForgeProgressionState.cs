using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Domain.Progression.Forge;

public sealed class ForgeProgressionState
{
    private readonly HashSet<ForgeDiscoveryId> discovered = [];
    private readonly HashSet<ForgeMasteryId> forged = [];

    public IReadOnlySet<ForgeDiscoveryId> Discovered => new HashSet<ForgeDiscoveryId>(discovered);
    public IReadOnlySet<ForgeMasteryId> Forged => new HashSet<ForgeMasteryId>(forged);
    public int Count => discovered.Count;
    public int MasteryCount => forged.Count;

    public bool Contains(ForgeDiscoveryId id) => discovered.Contains(id);
    public bool IsForged(ForgeMasteryId id) => forged.Contains(id);

    public IReadOnlyList<ForgeDiscoveryDefinition> Discover(ForgeDiscoveryContext context)
    {
        ArgumentNullException.ThrowIfNull(context);
        var unlocked = new List<ForgeDiscoveryDefinition>();
        foreach (var definition in ForgeDiscoveryCatalog.All)
        {
            if (discovered.Contains(definition.Id) || !definition.Requirement.IsSatisfiedBy(context)) continue;
            discovered.Add(definition.Id);
            unlocked.Add(definition);
        }
        return unlocked;
    }

    public bool CanForge(ForgeMasteryId id, DragonEssenceVault vault)
    {
        ArgumentNullException.ThrowIfNull(vault);
        var definition = ForgeMasteryCatalog.Get(id);
        if (!discovered.Contains(definition.Lineage) || forged.Contains(id)) return false;
        if (definition.Prerequisite is { } prerequisite && !forged.Contains(prerequisite)) return false;
        return vault.Count(definition.Cost) > 0;
    }

    public bool Forge(ForgeMasteryId id, DragonEssenceVault vault)
    {
        if (!CanForge(id, vault)) return false;
        var definition = ForgeMasteryCatalog.Get(id);
        if (!vault.Consume(definition.Cost)) return false;
        forged.Add(id);
        return true;
    }

    public bool UnlocksOffering(DragonEssenceId essenceId) => ForgedUnlocks<RunOfferingUnlock>().Any(unlock => unlock.EssenceId == essenceId);

    public bool UnlocksSpell(SpellId spellId) => ForgedUnlocks<SpellPoolUnlock>().Any(unlock => unlock.SpellId == spellId);

    public bool UnlocksRelic(RelicId relicId) => ForgedUnlocks<RelicPoolUnlock>().Any(unlock => unlock.RelicId == relicId);

    public bool UnlocksEvolution(SpellEvolutionId evolutionId) => ForgedUnlocks<EvolutionPoolUnlock>().Any(unlock => unlock.EvolutionId == evolutionId);

    public void Restore(IEnumerable<ForgeDiscoveryId> discoveries)
    {
        ArgumentNullException.ThrowIfNull(discoveries);
        discovered.Clear();
        foreach (var discovery in discoveries.Where(id => ForgeDiscoveryCatalog.All.Any(definition => definition.Id == id))) discovered.Add(discovery);
    }

    public void RestoreMasteries(IEnumerable<ForgeMasteryId> masteries)
    {
        ArgumentNullException.ThrowIfNull(masteries);
        var requested = masteries.ToHashSet();
        forged.Clear();
        foreach (var definition in ForgeMasteryCatalog.All.OrderBy(definition => definition.Tier))
        {
            if (!requested.Contains(definition.Id) || !discovered.Contains(definition.Lineage)) continue;
            if (definition.Prerequisite is { } prerequisite && !forged.Contains(prerequisite)) continue;
            forged.Add(definition.Id);
        }
    }

    private IEnumerable<TUnlock> ForgedUnlocks<TUnlock>() where TUnlock : ForgeFeatureUnlock => ForgeMasteryCatalog.All
        .Where(definition => forged.Contains(definition.Id))
        .SelectMany(definition => definition.Unlocks)
        .OfType<TUnlock>();
}
