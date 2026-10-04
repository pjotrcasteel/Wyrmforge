namespace Wyrmforge.Application.Runs.Navigation;

public sealed class WyrmrealmMapState
{
    public const int CombatStages = 4;
    public const int KillsPerCombatNode = 5;
    private readonly List<WyrmrealmMapNode> completedNodes = [];

    public WyrmrealmMapState(int depth = 1, int? seed = null)
    {
        Depth = depth;
        Seed = seed ?? Random.Shared.Next();
        Nodes = WyrmrealmMapGenerator.Generate(depth, Seed);
    }

    public int Depth { get; }
    public int Seed { get; }
    public IReadOnlyList<WyrmrealmMapNode> Nodes { get; }
    public IReadOnlyList<WyrmrealmMapNode> CompletedNodes => completedNodes;
    public WyrmrealmMapNode? CurrentNode { get; private set; }
    public bool DecisionPending { get; private set; } = true;
    public int CurrentNodeKills { get; private set; }
    public bool EncounterActive => !DecisionPending && CurrentNode is { Type: WyrmrealmNodeType.Combat, Route: not null };

    public IReadOnlyList<WyrmrealmMapNode> AvailableNodes
    {
        get
        {
            if (!DecisionPending) return Array.Empty<WyrmrealmMapNode>();
            if (completedNodes.Count == 0) return Nodes.Where(node => node.Stage == 1).ToArray();
            var previous = completedNodes[^1];
            return Nodes.Where(node => node.PreviousNodeIds.Contains(previous.Id, StringComparer.Ordinal)).ToArray();
        }
    }

    public WyrmrealmMapNode? Choose(string id)
    {
        if (!DecisionPending) return null;
        var node = AvailableNodes.SingleOrDefault(candidate => candidate.Id == id);
        if (node is null) return null;
        CurrentNode = node;
        CurrentNodeKills = 0;
        DecisionPending = false;
        return node;
    }

    public bool RegisterKill()
    {
        if (!EncounterActive) return false;
        CurrentNodeKills++;
        if (CurrentNodeKills < KillsPerCombatNode) return false;
        completedNodes.Add(CurrentNode!);
        CurrentNode = null;
        CurrentNodeKills = 0;
        DecisionPending = true;
        return true;
    }

    public void CompleteDragon()
    {
        if (CurrentNode is not { Type: WyrmrealmNodeType.Dragon } dragonNode) return;
        completedNodes.Add(dragonNode);
        CurrentNode = null;
    }
}
