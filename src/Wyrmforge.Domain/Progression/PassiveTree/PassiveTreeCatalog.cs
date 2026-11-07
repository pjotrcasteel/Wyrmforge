using System.Collections.Frozen;
using Wyrmforge.Domain.Progression.PassiveTree.Schools;

namespace Wyrmforge.Domain.Progression.PassiveTree;

public static class PassiveTreeCatalog
{
    public const int TotalPoints = 24;
    public const string OriginId = "wyrmheart";

    public static PassiveNodeDefinition Origin { get; } =
        new(OriginId, "Wyrmheart", "All Arcane paths begin here.", PassiveNodeKind.Origin, null, 0, 600, 450, PassiveNodeModifiers.None);

    public static IReadOnlyList<PassiveNodeDefinition> All { get; } =
    [
        Origin,
        .. FirePassiveNodes.All,
        .. FireSynergyNodes.All,
        .. FireOuterNodes.All,
        .. FrostPassiveNodes.All,
        .. StormPassiveNodes.All,
        .. ArcanePassiveNodes.All,
        .. HybridPassiveNodes.All,
    ];

    public static IReadOnlyList<PassiveTreeConnection> Connections { get; } =
    [
        .. FireOuterNodes.Connections,
        new(OriginId, "fire-start"),
        new(OriginId, "frost-start"),
        new(OriginId, "storm-start"),
        new(OriginId, "arcane-start"),

        new("fire-2", "fire-cinder-thread"),
        new("fire-cinder-thread", "fire-ember-memory"),
        new("fire-ember-memory", "fire-crucible"),
        new("fire-crucible", "fire-ember-covenant"),
        new("fire-ember-covenant", "fire-long-pyre"),
        new("fire-start", "fire-1"),
        new("fire-1", "fire-needle-practice"),
        new("fire-1", "fire-molten-density"),
        new("fire-needle-practice", "fire-blast-shaping"),
        new("fire-molten-density", "fire-banked-embers"),
        new("fire-1", "fire-2"),
        new("fire-2", "fire-major"),
        new("fire-major", "wildfire"),
        new("fire-major", "detonation"),
        new("wildfire", "inferno"),
        new("detonation", "volcanic"),
        // Distinct routes join the existing Fire spine without invalidating old saved nodes.
        new("fire-1", "fire-ember-drift"),
        new("fire-ember-drift", "fire-scorching-winds"),
        new("fire-scorching-winds", "fire-cinder-halo"),
        new("fire-cinder-halo", "fire-conflagration"),
        new("fire-conflagration", "fire-ashfront"),
        new("fire-ashfront", "fire-spread-crown"),

        new("fire-ember-drift", "fire-storm-gate"),
        new("fire-1", "fire-cinder-temper"),
        new("fire-cinder-temper", "fire-frost-gate"),
        new("fire-frost-gate", "fire-burning-veins"),
        new("fire-burning-veins", "fire-searing-focus"),
        new("fire-searing-focus", "fire-immolation"),
        new("fire-immolation", "fire-coalbed"),
        new("fire-coalbed", "fire-ember-altar"),
        new("fire-burning-veins", "fire-molten-density"),
        new("fire-immolation", "fire-banked-embers"),

        new("fire-1", "fire-frost-gate"),
        new("fire-1", "fire-storm-gate"),

        new("frost-start", "frost-1"),
        new("frost-1", "frost-2"),
        new("frost-2", "frost-major"),
        new("frost-major", "deep-freeze"),
        new("frost-major", "ice-armor"),
        new("deep-freeze", "absolute-zero"),
        new("ice-armor", "winter-shell"),
        new("frost-1", "frost-fire-gate"),
        new("frost-1", "frost-arcane-gate"),

        new("storm-start", "storm-1"),
        new("storm-1", "storm-2"),
        new("storm-2", "storm-major"),
        new("storm-major", "chainstorm"),
        new("storm-major", "tempest-step"),
        new("chainstorm", "living-storm"),
        new("tempest-step", "lightning-form"),
        new("storm-1", "storm-fire-gate"),
        new("storm-1", "storm-arcane-gate"),

        new("arcane-start", "arcane-1"),
        new("arcane-1", "arcane-2"),
        new("arcane-2", "arcane-major"),
        new("arcane-major", "arcane-echo"),
        new("arcane-major", "prismatic"),
        new("arcane-echo", "echo-chamber"),
        new("prismatic", "astral-barrage"),
        new("arcane-1", "arcane-frost-gate"),
        new("arcane-1", "arcane-storm-gate"),

        new("fire-frost-gate", "hybrid-fire-frost-1"),
        new("hybrid-fire-frost-1", "hybrid-fire-frost-2"),
        new("hybrid-fire-frost-2", "frost-fire-gate"),

        new("fire-storm-gate", "hybrid-fire-storm-1"),
        new("hybrid-fire-storm-1", "hybrid-fire-storm-2"),
        new("hybrid-fire-storm-2", "storm-fire-gate"),

        new("storm-arcane-gate", "hybrid-storm-arcane-1"),
        new("hybrid-storm-arcane-1", "hybrid-storm-arcane-2"),
        new("hybrid-storm-arcane-2", "arcane-storm-gate"),

        new("arcane-frost-gate", "hybrid-arcane-frost-1"),
        new("hybrid-arcane-frost-1", "hybrid-arcane-frost-2"),
        new("hybrid-arcane-frost-2", "frost-arcane-gate"),
    ];

    // Stable indexes keep route planning and inspection proportional to the visited
    // graph, rather than scanning the entire eventual six-school catalog per edge.
    private static readonly FrozenDictionary<string, PassiveNodeDefinition> NodesById =
        All.ToFrozenDictionary(node => node.Id, StringComparer.Ordinal);

    private static readonly FrozenDictionary<string, IReadOnlyList<string>> AdjacentNodes = Connections
        .SelectMany(edge => new[] { (Node: edge.From, Neighbor: edge.To), (Node: edge.To, Neighbor: edge.From) })
        .GroupBy(edge => edge.Node, StringComparer.Ordinal)
        .ToFrozenDictionary(group => group.Key,
            group => (IReadOnlyList<string>)Array.AsReadOnly(group.Select(edge => edge.Neighbor).ToArray()), StringComparer.Ordinal);

    public static PassiveNodeDefinition Get(string id) => NodesById.TryGetValue(id, out var node)
        ? node : throw new InvalidOperationException($"Unknown Arcane Web node '{id}'.");

    public static IReadOnlyList<string> Neighbors(string id) => AdjacentNodes.GetValueOrDefault(id) ?? Array.Empty<string>();
}
