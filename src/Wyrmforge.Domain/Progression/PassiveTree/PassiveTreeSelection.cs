namespace Wyrmforge.Domain.Progression.PassiveTree;

public sealed class PassiveTreeSelection
{
    private readonly HashSet<string> selected = [];

    public int SpentPoints => selected.Sum(id => PassiveTreeCatalog.Get(id).Cost);

    public IReadOnlySet<string> Selected => new HashSet<string>(selected);

    public bool CanSelect(string id)
    {
        if (selected.Contains(id)) return false;
        var node = PassiveTreeCatalog.Get(id);
        if (SpentPoints + node.Cost > PassiveTreeCatalog.TotalPoints) return false;
        if (!node.Requires.All(selected.Contains)) return false;
        if (node.Excludes.Any(selected.Contains)) return false;
        if (node.Tier == NodeTier.Legendary && selected.Any(selectedId => PassiveTreeCatalog.Get(selectedId).Tier == NodeTier.Legendary)) return false;
        return true;
    }

    public bool Select(string id)
    {
        if (!CanSelect(id)) return false;
        return selected.Add(id);
    }

    public bool CanRemove(string id)
    {
        if (!selected.Contains(id)) return false;
        return !PassiveTreeCatalog.All.Any(node => selected.Contains(node.Id) && node.Requires.Contains(id));
    }

    public bool Remove(string id)
    {
        if (!CanRemove(id)) return false;
        return selected.Remove(id);
    }

    public void Reset() => selected.Clear();
}
