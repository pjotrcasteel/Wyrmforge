namespace Wyrmforge.Domain.World;

/// <summary>
/// World state (amendment §6): which regions this player has charted. It belongs to the account's world, not to a story
/// Chronicle, so replaying a Chronicle never re-grants a first discovery and skipping the campaign never hides one.
/// </summary>
public sealed class RegionDiscoveryState
{
    private readonly List<RegionId> discovered = [];

    /// <summary>Discovery order, oldest first.</summary>
    public IReadOnlyList<RegionId> Discovered => discovered;

    public bool IsDiscovered(RegionId region) => discovered.Contains(region);

    /// <returns>True only the first time a region is charted.</returns>
    public bool Discover(RegionId region)
    {
        if (discovered.Contains(region)) return false;
        discovered.Add(region);
        return true;
    }

    /// <summary>Restores a save. Unknown or malformed ids are dropped rather than failing the load.</summary>
    public void Restore(IEnumerable<string>? saved)
    {
        discovered.Clear();
        foreach (var value in saved ?? [])
        {
            try { Discover(new RegionId(value)); }
            catch (ArgumentException) { }
        }
    }

    public string[] Save() => [.. discovered.Select(region => region.Value)];
}
