namespace Wyrmforge.Application.Runs.Navigation;

public sealed record WyrmrealmNodeGraph(IReadOnlyList<string> PreviousNodeIds, WyrmrealmNodeRarity Rarity = WyrmrealmNodeRarity.Common);
