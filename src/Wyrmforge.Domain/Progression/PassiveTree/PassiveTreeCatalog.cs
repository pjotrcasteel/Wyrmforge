using Wyrmforge.Domain.Progression.PassiveTree.Schools;

namespace Wyrmforge.Domain.Progression.PassiveTree;

public static class PassiveTreeCatalog
{
    public const int TotalPoints = 14;

    public static IReadOnlyList<PassiveNodeDefinition> All { get; } =
    [
        .. FirePassiveNodes.All,
        .. FrostPassiveNodes.All,
        .. StormPassiveNodes.All,
        .. ArcanePassiveNodes.All,
    ];

    public static PassiveNodeDefinition Get(string id) => All.Single(node => node.Id == id);
}
