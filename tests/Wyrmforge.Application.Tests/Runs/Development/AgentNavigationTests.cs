using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Agents;
using Wyrmforge.Application.World;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Agents;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Development;

[TestClass]
public sealed class AgentNavigationTests
{
    [TestMethod]
    public void Town_DynamicObstacleBlocksThenRemovalRecovers_WithoutPrivateGeometry()
    {
        var map = new TownNavigationMap { Width = 200, Height = 200, Clearance = 4,
            Walkable = [new() { Id = "floor", Points = [new(0, 0), new(200, 0), new(200, 200), new(0, 200)] }] };
        var adapter = new TownAgentNavigation(map);
        var request = new AgentPathRequest(new(30, 100), new(170, 100), 4);
        Assert.AreEqual(AgentPathStatus.Moving, adapter.Query(request, new(1)).Status);
        map.SetObstacle(new() { Id = "door", Footprint = [new(90, 0), new(110, 0), new(110, 200), new(90, 200)] });
        Assert.AreEqual(AgentPathStatus.Blocked, adapter.Query(request, new(1)).Status);
        map.RemoveObstacle("door");
        Assert.AreEqual(AgentPathStatus.Moving, adapter.Query(request, new(1)).Status);
        Assert.AreEqual(AgentPathStatus.Deferred, adapter.Query(request, new(0)).Status);
        Assert.AreEqual(AgentPathStatus.Blocked, adapter.Query(request with { Radius = 5 }, new(1)).Status);
    }

    [TestMethod]
    public void Hunt_ClosedGateBlocksAndOpeningRecovers_WithBudgetedQueries()
    {
        var map = new WyrmrealmMapState(seed: 25);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var gate = terrain.Snapshot().Barriers.Where(b => b.Kind == "gate").OrderBy(b => b.Y).First();
        const double width = 800, height = 1200;
        var x = (gate.X + gate.Width / 2) * width;
        var request = new AgentPathRequest(new(x, gate.Y * height - 35), new(x, (gate.Y + gate.Height) * height + 35), 9);
        var adapter = new HuntAgentNavigation(terrain, width, height);
        Assert.AreEqual(AgentPathStatus.Blocked, adapter.Query(request, new(1)).Status);
        terrain.SetPhase(EncounterPhase.BreathingRoom);
        Assert.AreEqual(AgentPathStatus.Moving, adapter.Query(request, new(1)).Status);
        Assert.AreEqual(AgentPathStatus.Deferred, adapter.Query(request, new(0)).Status);
        Assert.AreEqual(AgentPathStatus.Arrived, adapter.Query(request with { Destination = request.Position }, new(0)).Status);
    }
}
