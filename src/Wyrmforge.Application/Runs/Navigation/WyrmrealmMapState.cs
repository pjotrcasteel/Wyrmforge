using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Runs.Navigation;

public sealed class WyrmrealmMapState
{
    public const int CombatStages = 4;
    public const int KillsPerCombatNode = 5;

    private readonly List<WyrmrealmMapNode> completedNodes = [];
    private int completedCombatStages;

    public WyrmrealmMapState(DragonDefinition target)
    {
        Nodes =
        [
            new("fractured-fields", "Fractured Fields", 1, -1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.Swarm),
            new("rift-crossing", "Rift Crossing", 1, 1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.Mixed),
            new("hunters-vein", "Hunter's Vein", 2, -1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.StalkerPressure),
            new("glass-causeway", "Glass Causeway", 2, 1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.Swarm),
            new("shattered-confluence", "Shattered Confluence", 3, -1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.Mixed),
            new("silent-maw", "Silent Maw", 3, 1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.StalkerPressure),
            new("wyrmroad", "Wyrmroad", 4, -1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.Swarm),
            new("arcane-scar", "Arcane Scar", 4, 1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.Mixed),
            new("dragon-trail", target.Name, 5, 0, WyrmrealmNodeType.Dragon, null),
        ];
    }

    public IReadOnlyList<WyrmrealmMapNode> Nodes { get; }

    public IReadOnlyList<WyrmrealmMapNode> CompletedNodes => completedNodes;

    public WyrmrealmMapNode? CurrentNode { get; private set; }

    public bool DecisionPending { get; private set; } = true;

    public int CurrentNodeKills { get; private set; }

    public bool EncounterActive => !DecisionPending && CurrentNode is { Type: WyrmrealmNodeType.Combat };

    public IReadOnlyList<WyrmrealmMapNode> AvailableNodes
    {
        get
        {
            if (!DecisionPending) return Array.Empty<WyrmrealmMapNode>();
            var stage = completedCombatStages < CombatStages ? completedCombatStages + 1 : CombatStages + 1;
            return Nodes.Where(node => node.Stage == stage).ToArray();
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
        completedCombatStages++;
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
