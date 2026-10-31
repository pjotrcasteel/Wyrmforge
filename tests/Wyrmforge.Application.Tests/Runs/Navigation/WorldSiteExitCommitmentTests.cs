using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WorldSiteExitCommitmentTests
{
    [TestMethod]
    public void ForestFork_ClearedTrail_ProvidesOnePhysicalExitForEachLegalForwardChartEdge()
    {
        var simulation = CreateSimulation();
        var current = simulation.AvailableMapNodes.Single();
        Assert.IsTrue(simulation.ChooseMapNode(current.Id));
        var map = Get<WyrmrealmMapState>(simulation, "mapState");
        for (var index = 0; index < map.CurrentNodeKillsRequired; index++)
            map.RegisterKill(allowCompletion: false);
        Assert.IsTrue(map.TryCompleteEncounter());
        Get<List<WyrmrealmMapNode>>(simulation, "completedRouteNodes").Add(current);
        Set(simulation, "trailExitPending", true);

        var expected = current.Geography!.Ports.Where(port => !port.Entrance &&
            map.AvailableNodes.Any(node => node.Id == port.NeighborNodeId)).ToArray();
        var snapshot = simulation.CreateSnapshot();
        Assert.AreEqual(expected.Length, snapshot.ExitPorts.Count);
        Assert.IsGreaterThanOrEqualTo(2, expected.Length);
        Assert.IsNull(snapshot.Exit, "AR1 forks must not show an unrelated generic north exit.");

        // The graph is still authoritative, and no portal grants rewards on its own.
        Assert.AreEqual(map.AvailableNodes.Count, expected.Length);
    }

    [TestMethod]
    public void WalkedForkPort_CommitsOnlyItsMatchingRealWorldChartNeighbor()
    {
        var simulation = CreateSimulation();
        var current = simulation.AvailableMapNodes.Single();
        Assert.IsTrue(simulation.ChooseMapNode(current.Id));
        var map = Get<WyrmrealmMapState>(simulation, "mapState");
        for (var index = 0; index < map.CurrentNodeKillsRequired; index++)
            map.RegisterKill(allowCompletion: false);
        Assert.IsTrue(map.TryCompleteEncounter());
        Get<List<WyrmrealmMapNode>>(simulation, "completedRouteNodes").Add(current);
        Set(simulation, "trailExitPending", true);

        var destination = current.Geography!.Ports.First(port => !port.Entrance);
        var arena = simulation.Tick(0, default, 390, 844).World!;
        Get<PlayerState>(simulation, "player").Position =
            new Vector2D(arena.Width * destination.LocalPoint.X, arena.Height * destination.LocalPoint.Y);
        typeof(RunSimulation).GetMethod("TryReachTrailExit", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(simulation, null);

        Assert.IsFalse(simulation.TrailExitPending);
        CollectionAssert.AreEqual(new[] { destination.NeighborNodeId },
            simulation.AvailableMapNodes.Select(node => node.Id).ToArray());
        var unrelated = map.AvailableNodes.Single(node => node.Id != destination.NeighborNodeId);
        Assert.IsFalse(simulation.ChooseMapNode(unrelated.Id), "Walking east cannot select a west-only fork.");
        Assert.IsTrue(simulation.ChooseMapNode(destination.NeighborNodeId));
        Assert.IsNotNull(simulation.CurrentMapNode);
        Assert.AreEqual(destination.NeighborNodeId, simulation.CurrentMapNode.Id);
    }

    private static RunSimulation CreateSimulation()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(),
            seed: 1204, hunt: HuntSelection.FireTierOne);
        simulation.EnableWorldSiteGeography();
        return simulation;
    }

    private static T Get<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void Set(RunSimulation simulation, string name, object value) =>
        typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(simulation, value);
}
