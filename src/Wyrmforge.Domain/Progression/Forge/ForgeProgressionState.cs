using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Forge;

public sealed class ForgeProgressionState
{
    private readonly HashSet<ForgeDiscoveryId> discovered = [];

    public IReadOnlySet<ForgeDiscoveryId> Discovered => new HashSet<ForgeDiscoveryId>(discovered);
    public int Count => discovered.Count;

    public bool Contains(ForgeDiscoveryId id) => discovered.Contains(id);

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

    public bool UnlocksOffering(DragonEssenceId essenceId) => ForgeDiscoveryCatalog.All
        .Where(definition => discovered.Contains(definition.Id))
        .SelectMany(definition => definition.Unlocks)
        .OfType<RunOfferingUnlock>()
        .Any(unlock => unlock.EssenceId == essenceId);

    public void Restore(IEnumerable<ForgeDiscoveryId> discoveries)
    {
        ArgumentNullException.ThrowIfNull(discoveries);
        discovered.Clear();
        foreach (var discovery in discoveries.Where(id => ForgeDiscoveryCatalog.All.Any(definition => definition.Id == id))) discovered.Add(discovery);
    }
}
