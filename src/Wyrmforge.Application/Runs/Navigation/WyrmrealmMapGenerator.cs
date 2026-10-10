namespace Wyrmforge.Application.Runs.Navigation;

public static class WyrmrealmMapGenerator
{
    public static IReadOnlyList<WyrmrealmMapNode> Generate(int depth, int seed)
    {
        var topologyRandom = new Random(unchecked(seed * 397 ^ depth * 7919));
        var contentRandom = new Random(unchecked(seed * 733 ^ depth * 104729));
        var layouts = GenerateTopology(depth, topologyRandom);
        return WyrmrealmRouteGenerator.CreateNodes(depth, layouts, contentRandom);
    }

    private static IReadOnlyList<WyrmrealmNodeLayout> GenerateTopology(int depth, Random random)
    {
        var layers = new List<List<NodeDraft>>();
        var rareStage = RollRareStage(depth, random);
        for (var stage = 1; stage <= WyrmrealmMapState.CombatStages; stage++)
        {
            var width = stage is 1 or WyrmrealmMapState.CombatStages ? 3 : 4;
            var rareIndex = stage == rareStage ? random.Next(width) : -1;
            layers.Add(CreateLayer(depth, stage, width, rareIndex));
        }

        for (var stageIndex = 1; stageIndex < layers.Count; stageIndex++) ConnectLayers(layers[stageIndex - 1], layers[stageIndex], random);
        var layouts = layers.SelectMany(layer => layer).Select(ToLayout).ToList();
        var finalLayer = layers[^1];
        layouts.Add(new WyrmrealmNodeLayout(
            $"depth-{depth}-wyrm",
            WyrmrealmMapState.CombatStages + 1,
            0,
            finalLayer.Select(node => node.Id).ToArray(),
            WyrmrealmNodeRarity.Common));
        return layouts;
    }

    private static List<NodeDraft> CreateLayer(int depth, int stage, int width, int rareIndex)
    {
        var lanes = width == 4 ? new[] { -3, -1, 1, 3 } : new[] { -2, 0, 2 };
        return lanes.Select((lane, index) => new NodeDraft(
            $"depth-{depth}-stage-{stage}-lane-{lane}",
            stage,
            lane,
            index == rareIndex ? WyrmrealmNodeRarity.Rare : WyrmrealmNodeRarity.Common)).ToList();
    }

    private static void ConnectLayers(IReadOnlyList<NodeDraft> previous, IReadOnlyList<NodeDraft> current, Random random)
    {
        foreach (var node in current) node.PreviousNodeIds.Add(Nearest(previous, node.Lane).Id);
        foreach (var source in previous)
        {
            if (current.Any(node => node.PreviousNodeIds.Contains(source.Id))) continue;
            Nearest(current, source.Lane).PreviousNodeIds.Add(source.Id);
        }

        // Forks alternate with committed stretches so routes do not merge immediately.
        if (current[0].Stage % 2 == 0)
        {
            foreach (var source in previous)
            {
                foreach (var destination in current.OrderBy(node => Math.Abs(node.Lane - source.Lane)).ThenBy(_ => random.Next()).Take(2))
                    destination.PreviousNodeIds.Add(source.Id);
            }
        }

        foreach (var rare in current.Where(node => node.Rarity == WyrmrealmNodeRarity.Rare))
        {
            foreach (var source in previous.OrderBy(node => Math.Abs(node.Lane - rare.Lane)).ThenBy(node => node.Lane))
            {
                rare.PreviousNodeIds.Add(source.Id);
                if (rare.PreviousNodeIds.Count >= Math.Min(2, previous.Count)) break;
            }
        }
    }

    private static NodeDraft Nearest(IReadOnlyList<NodeDraft> nodes, int lane) => nodes.OrderBy(node => Math.Abs(node.Lane - lane)).ThenBy(node => node.Lane).First();

    private static int? RollRareStage(int depth, Random random)
    {
        var chance = Math.Min(0.9, 0.55 + depth * 0.1);
        return random.NextDouble() < chance ? random.Next(2, WyrmrealmMapState.CombatStages + 1) : null;
    }

    private static WyrmrealmNodeLayout ToLayout(NodeDraft node) => new(node.Id, node.Stage, node.Lane, node.PreviousNodeIds.OrderBy(id => id, StringComparer.Ordinal).ToArray(), node.Rarity);

    private sealed class NodeDraft(string id, int stage, int lane, WyrmrealmNodeRarity rarity)
    {
        public string Id { get; } = id;
        public int Stage { get; } = stage;
        public int Lane { get; } = lane;
        public WyrmrealmNodeRarity Rarity { get; } = rarity;
        public HashSet<string> PreviousNodeIds { get; } = [];
    }
}

internal sealed record WyrmrealmNodeLayout(string Id, int Stage, int Lane, IReadOnlyList<string> PreviousNodeIds, WyrmrealmNodeRarity Rarity);
