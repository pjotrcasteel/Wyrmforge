using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Navigation;

public sealed class WyrmrealmMapState
{
    public const int CombatStages = 4;
    public const int KillsPerCombatNode = 5;

    private readonly List<WyrmrealmMapNode> completedNodes = [];
    private int completedCombatStages;

    public WyrmrealmMapState(DragonDefinition target)
    {
        ArgumentNullException.ThrowIfNull(target);
        Nodes =
        [
            new("scorched-hollow", "Scorched Hollow", 1, -1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.Swarm, SpellSchool.Fire),
            new("static-crossing", "Static Crossing", 1, 1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.Mixed, SpellSchool.Storm),
            new("frozen-vein", "Frozen Vein", 2, -1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.StalkerPressure, SpellSchool.Frost),
            new("arcane-causeway", "Arcane Causeway", 2, 1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.Swarm, SpellSchool.Arcane),
            new("ember-confluence", "Ember Confluence", 3, -1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.Mixed, SpellSchool.Fire),
            new("thunder-maw", "Thunder Maw", 3, 1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.StalkerPressure, SpellSchool.Storm),
            new("winter-wyrmroad", "Winter Wyrmroad", 4, -1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.Swarm, SpellSchool.Frost),
            new("arcane-scar", "Arcane Scar", 4, 1, WyrmrealmNodeType.Combat, WyrmrealmEncounterKind.Mixed, SpellSchool.Arcane),
            new("dragon-trail", "Unknown Wyrm", 5, 0, WyrmrealmNodeType.Dragon, null, null),
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
