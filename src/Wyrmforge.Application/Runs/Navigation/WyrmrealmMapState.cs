using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Navigation;

public sealed class WyrmrealmMapState
{
    public const int CombatStages = 4;
    public const int KillsPerCombatNode = 5;

    private readonly List<WyrmrealmMapNode> completedNodes = [];
    private int completedCombatStages;

    public WyrmrealmMapState(int depth = 1)
    {
        Depth = depth;
        Nodes = depth <= 1 ? CreateSurfaceNodes() : CreateDeepNodes(depth);
    }

    public int Depth { get; }

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

    private static IReadOnlyList<WyrmrealmMapNode> CreateSurfaceNodes() =>
    [
        new("scorched-hollow", "Scorched Hollow", 1, -1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.Swarm, SpellSchool.Fire, 100, new(SpawnIntervalMultiplier: 0.82))),
        new("static-crossing", "Static Crossing", 1, 1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.Mixed, SpellSchool.Storm, 50, new(RecoveryFraction: 0.05, EnemySpeedMultiplier: 1.12))),
        new("frozen-vein", "Frozen Vein", 2, -1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.StalkerPressure, SpellSchool.Frost, 80, new(RecoveryFraction: 0.08, EnemyHealthMultiplier: 1.12))),
        new("arcane-causeway", "Arcane Causeway", 2, 1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.Swarm, SpellSchool.Arcane, 180, new(SpawnIntervalMultiplier: 0.78, EnemySpeedMultiplier: 1.08))),
        new("ember-confluence", "Ember Confluence", 3, -1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.Mixed, SpellSchool.Fire, 220, new(EnemyHealthMultiplier: 1.18))),
        new("thunder-maw", "Thunder Maw", 3, 1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.StalkerPressure, SpellSchool.Storm, 140, new(RecoveryFraction: 0.08, EnemySpeedMultiplier: 1.18))),
        new("winter-wyrmroad", "Winter Wyrmroad", 4, -1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.Swarm, SpellSchool.Frost, 120, new(RecoveryFraction: 0.12, SpawnIntervalMultiplier: 0.76))),
        new("arcane-scar", "Arcane Scar", 4, 1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.Mixed, SpellSchool.Arcane, 300, new(EnemyHealthMultiplier: 1.22, EnemySpeedMultiplier: 1.08))),
        new("dragon-trail", "Unknown Wyrm", 5, 0, WyrmrealmNodeType.Dragon, null),
    ];

    private static IReadOnlyList<WyrmrealmMapNode> CreateDeepNodes(int depth) =>
    [
        new($"depth-{depth}-ashen-fall", "Ashen Fall", 1, -1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.Swarm, SpellSchool.Fire, 250, new(SpawnIntervalMultiplier: 0.74, Hazard: Rift(1.05)))),
        new($"depth-{depth}-stormglass-rift", "Stormglass Rift", 1, 1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.Mixed, SpellSchool.Storm, 350, new(EnemySpeedMultiplier: 1.15, Hazard: Rift(0.78)))),
        new($"depth-{depth}-frostbound-vault", "Frostbound Vault", 2, -1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.StalkerPressure, SpellSchool.Frost, 160, new(RecoveryFraction: 0.14, EnemyHealthMultiplier: 1.22))),
        new($"depth-{depth}-aether-break", "Aether Break", 2, 1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.Swarm, SpellSchool.Arcane, 420, new(SpawnIntervalMultiplier: 0.72, Hazard: Rift(0.82)))),
        new($"depth-{depth}-cinder-abyss", "Cinder Abyss", 3, -1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.Mixed, SpellSchool.Fire, 480, new(EnemyHealthMultiplier: 1.28, Hazard: Rift(0.92)))),
        new($"depth-{depth}-tempest-spine", "Tempest Spine", 3, 1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.StalkerPressure, SpellSchool.Storm, 540, new(EnemySpeedMultiplier: 1.28, Hazard: Rift(0.7)))),
        new($"depth-{depth}-rime-descent", "Rime Descent", 4, -1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.Swarm, SpellSchool.Frost, 220, new(RecoveryFraction: 0.16, SpawnIntervalMultiplier: 0.76))),
        new($"depth-{depth}-void-conduit", "Void Conduit", 4, 1, WyrmrealmNodeType.Combat, Route(WyrmrealmEncounterKind.Mixed, SpellSchool.Arcane, 650, new(SpawnIntervalMultiplier: 0.78, EnemyHealthMultiplier: 1.25, Hazard: Rift(0.64)))),
        new($"depth-{depth}-dragon-trail", "Unknown Wyrm", 5, 0, WyrmrealmNodeType.Dragon, null),
    ];

    private static WyrmrealmRouteProfile Route(WyrmrealmEncounterKind kind, SpellSchool school, int score, WyrmrealmRouteTuning? tuning = null)
    {
        tuning ??= new WyrmrealmRouteTuning();
        var encounter = new WyrmrealmEncounterProfile(kind, tuning.SpawnIntervalMultiplier, tuning.EnemyHealthMultiplier, tuning.EnemySpeedMultiplier);
        var reward = new WyrmrealmRewardProfile(school, score, tuning.RecoveryFraction);
        return new WyrmrealmRouteProfile(encounter, reward, tuning.Hazard);
    }

    private static WyrmrealmHazardProfile Rift(double intervalMultiplier) => new(WyrmrealmHazardKind.UnstableRifts, intervalMultiplier);
}
