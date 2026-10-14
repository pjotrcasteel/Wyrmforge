using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class ArenaEnvironmentStateTests
{
    [TestMethod]
    public void Create_SameSeedAndRoute_ReproducesTerrainWithoutChangingMap()
    {
        var map = new WyrmrealmMapState(seed: 1204);
        var node = map.AvailableNodes[0];
        var first = ArenaEnvironmentState.Create(map.Seed, node).Snapshot();
        var second = ArenaEnvironmentState.Create(map.Seed, node).Snapshot();
        Assert.AreEqual(first.Seed, second.Seed);
        Assert.AreEqual(first.Biome, second.Biome);
        Assert.AreEqual(first.Landmark, second.Landmark);
        CollectionAssert.AreEqual(first.Supplies.ToArray(), second.Supplies.ToArray());
        Assert.AreEqual(2, first.Supplies.Count);
        Assert.IsTrue(first.Supplies.All(supply => !supply.Open));
    }

    [TestMethod]
    public void SetPhase_AfterSecondAndThirdWaves_UnlocksDistinctCacheAlcoves()
    {
        var map = new WyrmrealmMapState(seed: 892);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);

        terrain.SetPhase(EncounterPhase.Escalation);
        Assert.IsTrue(terrain.Snapshot().Supplies.All(supply => !supply.Open));

        terrain.SetPhase(EncounterPhase.BreathingRoom);
        var first = terrain.Snapshot();
        Assert.IsTrue(first.Supplies.Single(supply => supply.Kind == "experience").Open);
        Assert.IsFalse(first.Supplies.Single(supply => supply.Kind == "health").Open);

        terrain.SetPhase(EncounterPhase.Surge);
        Assert.IsTrue(terrain.Snapshot().Supplies.All(supply => supply.Open));
    }

    [TestMethod]
    public void TryCollect_OnlyOpenSuppliesRewardWhenReachedAndOnlyOnce()
    {
        var map = new WyrmrealmMapState(seed: 522);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var supply = terrain.Snapshot().Supplies.Single(item => item.Kind == "experience");
        var position = new Vector2D(supply.X * 390, supply.Y * 700);

        Assert.IsNull(terrain.TryCollect(position, 390, 700, 10, true));
        terrain.SetPhase(EncounterPhase.BreathingRoom);
        Assert.IsNull(terrain.TryCollect(Vector2D.Zero, 390, 700, 10, true));
        Assert.IsNotNull(terrain.TryCollect(position, 390, 700, 10, true));
        Assert.IsNull(terrain.TryCollect(position, 390, 700, 10, true));
        Assert.AreEqual(1, terrain.Snapshot().Supplies.Count);
    }

    [TestMethod]
    public void TryCollect_HealthIsPreservedUntilActuallyUseful()
    {
        var map = new WyrmrealmMapState(seed: 90);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        terrain.SetPhase(EncounterPhase.Surge);
        var cache = terrain.Snapshot().Supplies.Single(item => item.Kind == "health");
        var position = new Vector2D(cache.X * 390, cache.Y * 700);

        Assert.IsNull(terrain.TryCollect(position, 390, 700, 10, false));
        Assert.IsNotNull(terrain.TryCollect(position, 390, 700, 10, true));
    }

    [TestMethod]
    public void CompleteTrail_WalkingIntoVisibleExit_RevealsNextMapDecision()
    {
        var simulation = new RunSimulationFactory(new Wyrmforge.Application.Tests.TestDoubles.FirstRandomSource())
            .Create(new HashSet<string>(), seed: 1204);
        simulation.Tick(0, default, 390, 700);
        var first = simulation.AvailableMapNodes[0];
        Assert.IsTrue(simulation.ChooseMapNode(first.Id));

        // Use the real map completion state to focus this test on traversal rather than enemy AI.
        var field = typeof(RunSimulation).GetField("mapState", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
        var map = (WyrmrealmMapState)field.GetValue(simulation)!;
        for (var kill = 0; kill < map.CurrentNodeKillsRequired; kill++) map.RegisterKill(false);
        Assert.IsTrue(map.TryCompleteEncounter());
        var complete = typeof(RunSimulation).GetMethod("CompleteTrail", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
        complete.Invoke(simulation, [first]);
        var cleanup = typeof(RunSimulation).GetMethod("CompleteMapEncounterCleanup", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
        cleanup.Invoke(simulation, null);
        for (var choice = 0; simulation.PendingChoices.Count > 0 && choice < 10; choice++)
            Assert.IsTrue(simulation.ApplyChoice(simulation.PendingChoices[0].Id));

        Assert.IsTrue(simulation.TrailExitPending);
        Assert.IsFalse(simulation.PendingMapChoice);
        var exit = simulation.CreateSnapshot().Exit;
        Assert.IsNotNull(exit);

        var playerField = typeof(RunSimulation).GetField("player", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
        var player = (Wyrmforge.Domain.Combat.Player.PlayerState)playerField.GetValue(simulation)!;
        player.Position = new Vector2D(exit.X, exit.Y + exit.Radius + player.Radius + 8);
        simulation.Tick(0.05, new MovementInput(0, -1), 390, 700);

        Assert.IsFalse(simulation.TrailExitPending);
        Assert.IsTrue(simulation.PendingMapChoice);
        Assert.IsNull(simulation.CreateSnapshot().Exit);
        Assert.IsGreaterThan(0, simulation.CompletedMapNodes.Count);
    }

    [TestMethod]
    public void RestrictMovement_SealedCacheIsSolidButMainPassageRemainsOpen()
    {
        var map = new WyrmrealmMapState(seed: 27);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var cache = terrain.Snapshot().Supplies.First();
        var center = new Vector2D(cache.X * 390, cache.Y * 700);
        var outside = center + new Vector2D(35, 0);
        var inside = center + new Vector2D(28, 0);

        Assert.AreEqual(outside, terrain.RestrictMovement(outside, inside, 390, 700));
        terrain.SetPhase(EncounterPhase.Surge);
        Assert.AreEqual(inside, terrain.RestrictMovement(outside, inside, 390, 700));
        Assert.AreEqual(new Vector2D(195, 350), terrain.RestrictMovement(new Vector2D(195, 350), new Vector2D(195, 350), 390, 700));
    }
}
