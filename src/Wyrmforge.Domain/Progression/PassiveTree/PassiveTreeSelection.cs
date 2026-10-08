namespace Wyrmforge.Domain.Progression.PassiveTree;

public sealed class PassiveTreeSelection
{
    private readonly HashSet<string> selected = [];
    private readonly int pointBudget;

    public PassiveTreeSelection(int pointBudget = PassiveTreeCatalog.TotalPoints)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(pointBudget, 1);
        this.pointBudget = pointBudget;
    }

    public int SpentPoints => selected.Sum(id => PassiveTreeCatalog.Get(id).Cost);

    public int PointBudget => pointBudget;

    public IReadOnlySet<string> Selected => new HashSet<string>(selected);

    public bool CanSelect(string id)
    {
        if (id == PassiveTreeCatalog.OriginId || selected.Contains(id)) return false;
        var node = PassiveTreeCatalog.Get(id);
        if (SpentPoints + node.Cost > pointBudget) return false;
        if (node.MasteryGroup is { } group && selected.Any(selectedId => PassiveTreeCatalog.Get(selectedId).MasteryGroup == group)) return false;
        return PassiveTreeCatalog.Neighbors(id).Any(IsConnectedAnchor);
    }

    public bool Select(string id)
    {
        if (!CanSelect(id)) return false;
        return selected.Add(id);
    }

    public bool CanRemove(string id)
    {
        if (!selected.Contains(id)) return false;
        var remaining = selected.Where(selectedId => selectedId != id).ToHashSet();
        if (remaining.Count == 0) return true;

        var reachable = new HashSet<string> { PassiveTreeCatalog.OriginId };
        var queue = new Queue<string>();
        queue.Enqueue(PassiveTreeCatalog.OriginId);
        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            foreach (var neighbor in PassiveTreeCatalog.Neighbors(current))
            {
                if (!remaining.Contains(neighbor) || !reachable.Add(neighbor)) continue;
                queue.Enqueue(neighbor);
            }
        }
        return remaining.All(reachable.Contains);
    }

    public bool Remove(string id)
    {
        if (!CanRemove(id)) return false;
        return selected.Remove(id);
    }

    public bool SelectPath(IEnumerable<string> ids)
    {
        ArgumentNullException.ThrowIfNull(ids);
        var original = selected.ToHashSet(StringComparer.Ordinal);

        foreach (var id in ids)
        {
            if (selected.Contains(id)) continue;
            if (Select(id)) continue;

            selected.Clear();
            selected.UnionWith(original);
            return false;
        }

        return true;
    }

    public void RestoreNodes(IEnumerable<string> ids)
    {
        selected.Clear();
        var remaining = ids.Where(id => id != PassiveTreeCatalog.OriginId && PassiveTreeCatalog.All.Any(node => node.Id == id)).ToHashSet();
        while (remaining.Count > 0)
        {
            var next = remaining.FirstOrDefault(CanSelect);
            if (next is null) break;
            Select(next);
            remaining.Remove(next);
        }
    }

    public void Reset() => selected.Clear();

    private bool IsConnectedAnchor(string id) => id == PassiveTreeCatalog.OriginId || selected.Contains(id);
}
