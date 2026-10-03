using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Domain.Progression.Codex;

public sealed class ArcaneCodex
{
    private readonly HashSet<SynergyId> discoveries = [];

    public int Count => discoveries.Count;

    public bool Contains(SynergyId id) => discoveries.Contains(id);

    public bool Discover(SynergyId id) => discoveries.Add(id);

    public void Restore(IEnumerable<SynergyId> synergyIds)
    {
        ArgumentNullException.ThrowIfNull(synergyIds);
        discoveries.Clear();
        discoveries.UnionWith(synergyIds);
    }
}