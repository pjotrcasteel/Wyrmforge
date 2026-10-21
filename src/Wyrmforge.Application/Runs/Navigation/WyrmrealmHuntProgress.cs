namespace Wyrmforge.Application.Runs.Navigation;

/// <summary>
/// Route-relative proximity to the Wyrm. Counts only nodes actually visited along
/// the selected route, not every alternative or optional node in the Hunt graph.
/// This is separate from the eight combat-pressure stages and threat/depth tiers.
/// </summary>
public static class WyrmrealmHuntProgress
{
    /// <param name="currentNode">1-based position in the chosen route, including the final Wyrm node.</param>
    /// <param name="routeNodeCount">Total nodes in that chosen route, including the starting and Wyrm nodes.</param>
    public static double Fraction(int currentNode, int routeNodeCount)
    {
        if (routeNodeCount < 2) throw new ArgumentOutOfRangeException(nameof(routeNodeCount));
        if (currentNode < 1 || currentNode > routeNodeCount)
            throw new ArgumentOutOfRangeException(nameof(currentNode));
        return (currentNode - 1d) / (routeNodeCount - 1d);
    }
}
