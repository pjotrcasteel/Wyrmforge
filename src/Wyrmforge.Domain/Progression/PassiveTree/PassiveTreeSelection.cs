namespace Wyrmforge.Domain.Progression.PassiveTree;

public sealed class PassiveTreeSelection
{
    private readonly HashSet<string> selected = [];
    private int pointBudget;
    private IReadOnlySet<Wyrmforge.Domain.Progression.Signature.FireballMutationId>? knownMutations;

    // Null is the legacy catalogue/import authoring context. The character editor
    // always binds its actual school before allowing player allocation or loadouts.
    public PassiveSchool? ActiveSchool { get; private set; }
    public int ReservedPoints => 0;
    public IReadOnlyDictionary<PassiveSchool, int> Reserved => new Dictionary<PassiveSchool, int>();
    public int AvailablePoints => Math.Max(0, PointBudget - SpentPoints - ReservedPoints);

    public void SetActiveSchool(PassiveSchool school)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(Enum.IsDefined(school), false);
        ActiveSchool = school;
    }

    public void SetKnownFireballMutations(IEnumerable<Wyrmforge.Domain.Progression.Signature.FireballMutationId> mutations) =>
        knownMutations = mutations.ToHashSet();

    public bool CanLearn(PassiveNodeDefinition node) =>
        (ActiveSchool is null || ArcaneSchoolCatalog.Owner(node) == ActiveSchool) &&
        (node.Requirement?.FireballMutation is not { } mutation || knownMutations is null || knownMutations.Contains(mutation));

    public void RestoreReserved(IReadOnlyDictionary<PassiveSchool, int>? saved)
    {
        // Legacy reservations represented already-refunded points within PointBudget.
        // Releasing them needs no budget increment and is idempotent on every reload.
    }

    public PassiveTreeSelection(int pointBudget = PassiveTreeCatalog.TotalPoints)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(pointBudget, 1);
        this.pointBudget = pointBudget;
    }

    public int SpentPoints => selected.Sum(id => PassiveTreeCatalog.Get(id).Cost);

    public int PointBudget => pointBudget;

    public void GrantPoints(int count) => pointBudget = Math.Clamp(pointBudget + Math.Max(0, count), 1, PassiveTreeCatalog.TotalPoints);

    public void RestoreBudget(int budget) => pointBudget = Math.Clamp(Math.Max(budget, SpentPoints + ReservedPoints), 1, PassiveTreeCatalog.TotalPoints);

    public IReadOnlySet<string> Selected => new HashSet<string>(selected);

    public bool CanSelect(string id)
    {
        if (id == PassiveTreeCatalog.OriginId || selected.Contains(id)) return false;
        var node = PassiveTreeCatalog.Get(id);
        if (!CanLearn(node) || node.Cost > AvailablePoints) return false;
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
            var next = remaining.FirstOrDefault(CanRestore);
            if (next is null) break;
            selected.Add(next);
            remaining.Remove(next);
        }
    }

    public void Reset()
    {
        selected.Clear();
    }

    // Loadouts are edits, not save restoration. They cannot teach another school,
    // erase its learned nodes. Refunds share the existing earned-point balance.
    public void ReallocateNodes(IEnumerable<string> ids)
    {
        if (ActiveSchool is null) { RestoreNodes(ids); return; }
        var requested = ids.Where(id => PassiveTreeCatalog.All.Any(node => node.Id == id)).ToHashSet(StringComparer.Ordinal);
        var removals = selected.Where(id => !requested.Contains(id) && ArcaneSchoolCatalog.Owner(PassiveTreeCatalog.Get(id)) == ActiveSchool).ToHashSet();
        while (removals.FirstOrDefault(CanRemove) is { } removable)
        {
            Remove(removable);
            removals.Remove(removable);
        }
        var additions = requested.Where(id => !selected.Contains(id)).ToHashSet();
        while (additions.FirstOrDefault(CanSelect) is { } next)
        {
            Select(next);
            additions.Remove(next);
        }
    }

    private bool CanRestore(string id)
    {
        var node = PassiveTreeCatalog.Get(id);
        return node.Cost <= AvailablePoints && !HasMasteryConflict(node) && PassiveTreeCatalog.Neighbors(id).Any(IsConnectedAnchor);
    }

    private bool HasMasteryConflict(PassiveNodeDefinition node) => node.MasteryGroup is { } group &&
        selected.Any(id => PassiveTreeCatalog.Get(id).MasteryGroup == group);

    private bool IsConnectedAnchor(string id) => id == PassiveTreeCatalog.OriginId || selected.Contains(id);
}
