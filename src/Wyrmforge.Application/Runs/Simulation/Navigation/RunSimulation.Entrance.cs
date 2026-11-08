using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    // This is an actual C# player walk through the collision field, not a JS sprite translation.
    // Simulation time, attacks, hazards, spawns and input remain frozen until the route is complete.
    private const double HuntEntranceDistance = 144;
    private const double HuntEntranceSpeed = 105;
    private readonly List<Vector2D> huntEntranceRoute = [];
    private int huntEntranceWaypoint;

    /// <summary>Whether the hunter is following the short safe approach from the south road.</summary>
    public bool HuntEntranceActive => huntEntranceWaypoint < huntEntranceRoute.Count;

    /// <summary>Skip the scripted approach for reduced-motion users, without skipping terrain loading.</summary>
    public void SkipHuntEntrance()
    {
        huntEntranceRoute.Clear();
        huntEntranceWaypoint = 0;
    }

    private void StageHuntEntrance()
    {
        SkipHuntEntrance();
        if (arenaEnvironment?.Terrain is not { Road.Count: > 3 } terrain) return;
        arenaWidth = ArenaMetricEnvelope.CombatWidth;
        arenaHeight = ArenaMetricEnvelope.CombatHeight;
        EnsurePlayerPosition(arenaWidth, arenaHeight);

        var last = player.Position;
        var distance = 0d;
        // Generator guarantees this painted S-curve is a protected walkable route.
        // Quantised road coordinates are in 1/16-metre-cell units.
        for (var index = 0; index + 1 < terrain.Road.Count; index += 2)
        {
            var point = new Vector2D(
                terrain.Road[index] * ArenaTerrainGrid.CellUnits / 16d,
                terrain.Road[index + 1] * ArenaTerrainGrid.CellUnits / 16d);
            var segment = Vector2D.Distance(last, point);
            if (segment < 18) continue;
            var step = Math.Min(segment, HuntEntranceDistance - distance);
            var waypoint = last + Vector2D.DirectionTo(last, point) * step;
            huntEntranceRoute.Add(waypoint);
            last = waypoint;
            distance += step;
            if (distance >= HuntEntranceDistance - .01) break;
        }
    }

    private void AdvanceHuntEntrance(double delta, double width, double height)
    {
        var distanceBudget = Math.Clamp(delta, 0, .05) * HuntEntranceSpeed;
        while (HuntEntranceActive && distanceBudget > .001)
        {
            var destination = huntEntranceRoute[huntEntranceWaypoint];
            var distance = Vector2D.Distance(player.Position, destination);
            if (distance <= .25)
            {
                huntEntranceWaypoint++;
                continue;
            }
            var previous = player.Position;
            var proposed = previous + Vector2D.DirectionTo(previous, destination) * Math.Min(distance, distanceBudget);
            player.Position = arenaEnvironment!.RestrictMovement(previous, proposed, width, height, player.Radius);
            var actual = Vector2D.Distance(previous, player.Position);
            if (actual < .01)
            {
                // A map/obstacle variant must never pin a player in an endless scripted entrance.
                SkipHuntEntrance();
                break;
            }
            playerHeading = Vector2D.DirectionTo(previous, player.Position);
            distanceBudget -= actual;
            if (Vector2D.Distance(player.Position, destination) <= .25) huntEntranceWaypoint++;
        }
    }
}
