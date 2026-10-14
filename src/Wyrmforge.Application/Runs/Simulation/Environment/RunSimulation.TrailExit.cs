using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Application.Runs.Simulation.Snapshots;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private const double ExitRadius = 37;
    private bool trailExitPending;
    private double arenaWidth = 800;
    private double arenaHeight = 600;

    public bool TrailExitPending => trailExitPending;

    private Vector2D TrailExitPosition => new(arenaWidth * .5, Math.Max(60, arenaHeight * .2));

    private ArenaExitRenderSnapshot? CreateTrailExitSnapshot()
    {
        if (!trailExitPending) return null;
        var exit = TrailExitPosition;
        return new ArenaExitRenderSnapshot(exit.X, exit.Y, ExitRadius);
    }

    private void TryReachTrailExit()
    {
        if (!trailExitPending || Vector2D.Distance(player.Position, TrailExitPosition) > ExitRadius + player.Radius) return;
        trailExitPending = false;
    }
}
