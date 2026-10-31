using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private const double ExitRadius = 37;
    private bool trailExitPending;
    private double arenaWidth = 800;
    private double arenaHeight = 600;
    private double viewportWidth = 800;
    private double viewportHeight = 600;

    public bool TrailExitPending => trailExitPending;

    private Vector2D TrailExitPosition => new(arenaWidth * .5, Math.Max(80, arenaHeight * .11));

    private IReadOnlyList<WorldSitePort> WorldSiteExitPorts
    {
        get
        {
            if (!worldSiteGeographyEnabled || !trailExitPending || completedRouteNodes.Count == 0)
                return [];
            var completed = completedRouteNodes[^1];
            return completed.Geography?.Ports.Where(port => !port.Entrance &&
                mapState.AvailableNodes.Any(node => node.Id == port.NeighborNodeId)).ToArray() ?? [];
        }
    }

    private Vector2D ExitPosition(WorldSitePort port) =>
        new(port.LocalPoint.X * arenaWidth, port.LocalPoint.Y * arenaHeight);

    private IReadOnlyList<ArenaExitRenderSnapshot> CreateWorldSiteExitSnapshots() =>
        WorldSiteExitPorts.Select(port =>
        {
            var position = ExitPosition(port);
            return new ArenaExitRenderSnapshot(position.X, position.Y, ExitRadius);
        }).ToArray();

    private ArenaExitRenderSnapshot? CreateTrailExitSnapshot()
    {
        if (!trailExitPending || WorldSiteExitPorts.Count > 0) return null;
        var exit = TrailExitPosition;
        return new ArenaExitRenderSnapshot(exit.X, exit.Y, ExitRadius);
    }

    private void TryReachTrailExit()
    {
        if (!trailExitPending) return;
        foreach (var port in WorldSiteExitPorts)
        {
            if (Vector2D.Distance(player.Position, ExitPosition(port)) > ExitRadius + player.Radius) continue;
            // One physical exit commits the corresponding existing graph edge.
            // Route rewards and availability remain owned by WyrmrealmMapState.
            walkedExitNodeId = port.NeighborNodeId;
            trailExitPending = false;
            return;
        }
        if (WorldSiteExitPorts.Count > 0 ||
            Vector2D.Distance(player.Position, TrailExitPosition) > ExitRadius + player.Radius) return;
        trailExitPending = false;
    }
}
