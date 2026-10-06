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
        .. FrostPassiveNodes.All,
        .. StormPassiveNodes.All,
        .. ArcanePassiveNodes.All,
        .. HybridPassiveNodes.All,
    ];

    public static IReadOnlyList<PassiveTreeConnection> Connections { get; } =
    [
        new(OriginId, "fire-start"),
        new(OriginId, "frost-start"),
        new(OriginId, "storm-start"),
        new(OriginId, "arcane-start"),

        new("fire-start", "fire-1"),
        new("fire-1", "fire-2"),
        new("fire-2", "fire-major"),
        new("fire-major", "wildfire"),
        new("fire-major", "detonation"),
        new("wildfire", "inferno"),
        new("detonation", "volcanic"),
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

    public static PassiveNodeDefinition Get(string id) => All.Single(node => node.Id == id);

    public static IReadOnlyList<string> Neighbors(string id) => Connections
        .Where(connection => connection.From == id || connection.To == id)
        .Select(connection => connection.From == id ? connection.To : connection.From)
        .ToArray();
}
