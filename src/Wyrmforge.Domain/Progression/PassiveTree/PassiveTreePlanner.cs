namespace Wyrmforge.Domain.Progression.PassiveTree;

public static class PassiveTreePlanner
{
    public static PassiveTreeRoutePlan? Plan(PassiveTreeSelection selection, string targetId)
    {
        ArgumentNullException.ThrowIfNull(selection);
        var target = PassiveTreeCatalog.Get(targetId);
        if (targetId == PassiveTreeCatalog.OriginId || selection.Selected.Contains(targetId))
            return new PassiveTreeRoutePlan(targetId, Array.Empty<string>(), 0);
        if (HasMasteryConflict(selection, target)) return null;

        var distances = new Dictionary<string, int>(StringComparer.Ordinal);
        var previous = new Dictionary<string, string>(StringComparer.Ordinal);
        var queue = new PriorityQueue<string, int>();

        Seed(PassiveTreeCatalog.OriginId);
        foreach (var selectedId in selection.Selected.OrderBy(id => id, StringComparer.Ordinal)) Seed(selectedId);

        while (queue.Count > 0)
        {
            queue.TryDequeue(out var current, out var currentCost);
            if (current is null || distances[current] != currentCost) continue;
            if (current == targetId) break;

            foreach (var neighbor in PassiveTreeCatalog.Neighbors(current).OrderBy(id => id, StringComparer.Ordinal))
            {
                var node = PassiveTreeCatalog.Get(neighbor);
                if (HasMasteryConflict(selection, node)) continue;

                var additionalCost = selection.Selected.Contains(neighbor) || neighbor == PassiveTreeCatalog.OriginId ? 0 : node.Cost;
                var candidate = currentCost + additionalCost;
                if (distances.TryGetValue(neighbor, out var existing) && existing <= candidate) continue;

                distances[neighbor] = candidate;
                previous[neighbor] = current;
                queue.Enqueue(neighbor, candidate);
            }
        }

        if (!distances.TryGetValue(targetId, out var totalCost)) return null;

        var path = new List<string>();
        var cursor = targetId;
        while (previous.TryGetValue(cursor, out var parent))
        {
            if (!selection.Selected.Contains(cursor) && cursor != PassiveTreeCatalog.OriginId) path.Add(cursor);
            cursor = parent;
        }
        path.Reverse();

        return new PassiveTreeRoutePlan(cursor, path, totalCost);

        void Seed(string id)
        {
            distances[id] = 0;
            queue.Enqueue(id, 0);
        }
    }

    private static bool HasMasteryConflict(PassiveTreeSelection selection, PassiveNodeDefinition node) =>
        node.MasteryGroup is { } group && selection.Selected.Any(id =>
            PassiveTreeCatalog.Get(id).MasteryGroup == group && id != node.Id);
}
