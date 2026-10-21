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
    public void Create_NormalHunt_DoesNotEnableExperimentalArenaPropsOrArt()
    {
        var map = new WyrmrealmMapState(seed: 1204);
        var normal = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]).Snapshot();
        var lab = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0], generatorPreview: true).Snapshot();
        Assert.IsFalse(normal.GeneratorPreview);
        Assert.IsEmpty(normal.Props);
        Assert.IsTrue(lab.GeneratorPreview);
        Assert.IsGreaterThan(0, lab.Props.Count);
    }

    [TestMethod]
    public void Generate_SameHuntAndNode_StablePropsButDifferentSeedChangesArrangement()
    {
        var firstMap = new WyrmrealmMapState(seed: 1204);
        var secondMap = new WyrmrealmMapState(seed: 1205);
        var first = ArenaEnvironmentState.Create(firstMap.Seed, firstMap.AvailableNodes[0], generatorPreview: true).Snapshot();
        var again = ArenaEnvironmentState.Create(firstMap.Seed, firstMap.AvailableNodes[0]).Snapshot();
        var different = ArenaEnvironmentState.Create(secondMap.Seed, secondMap.AvailableNodes[0], generatorPreview: true).Snapshot();

        CollectionAssert.AreEqual(first.Props.ToArray(), again.Props.ToArray());
        Assert.IsGreaterThan(0, first.Props.Count);
        Assert.IsFalse(first.Props.SequenceEqual(different.Props));
        Assert.IsTrue(first.Props.All(prop => prop.X < .32 || prop.X > .68));
    }

    [TestMethod]
    public void WyrmInfluence_ProgressesTowardLairAndKeepsRewardSchoolIndependent()
    {
        Assert.AreEqual(0, HuntArenaGenerator.WyrmInfluence(1, false));
        Assert.IsGreaterThan(HuntArenaGenerator.WyrmInfluence(1, false), HuntArenaGenerator.WyrmInfluence(3, false));
        Assert.IsGreaterThan(HuntArenaGenerator.WyrmInfluence(6, false), HuntArenaGenerator.WyrmInfluence(6, true));
        Assert.AreEqual(1, HuntArenaGenerator.WyrmInfluence(8, true));
        var first = new WyrmrealmMapState(seed: 1220);
        var snapshot = ArenaEnvironmentState.Create(first.Seed, first.AvailableNodes[0]).Snapshot();
        Assert.AreEqual("fire", snapshot.Element);
    }

    [TestMethod]
    public void ProjectileBreaksPhysicalProp_AndLootCanOnlyBeCollectedOnce()
    {
        const int width = 950, height = 1550;
        var map = new WyrmrealmMapState(seed: 311);
        var environment = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0], generatorPreview: true);
        var prop = environment.Snapshot().Props.First(prop => prop.Kind is "barrel" or "crate" or "stump" or "urn" or "ember-urn");
        var center = new Vector2D(prop.X * width, prop.Y * height);
        Assert.IsTrue(environment.IsBlocked(center, width, height, 1));
        Assert.IsTrue(environment.TryDamageProp(center, width, height, 3, 1000));
        Assert.IsFalse(environment.IsBlocked(center, width, height, 1));
        Assert.IsFalse(environment.TryDamageProp(center, width, height, 3, 1000));
        Assert.IsFalse(environment.Snapshot().Props.Any(item => item.Id == prop.Id));

        var awarded = environment.Snapshot().Supplies.Where(supply => supply.Open).ToArray();
        Assert.IsLessThanOrEqualTo(1, awarded.Length);
        if (awarded.Length == 1)
        {
            var pickup = new Vector2D(awarded[0].X * width, awarded[0].Y * height);
            Assert.IsNotNull(environment.TryCollect(pickup, width, height, 10, true));
            Assert.IsNull(environment.TryCollect(pickup, width, height, 10, true));
        }
    }
    [TestMethod]
    public void EnemyNavigationTarget_ApproachesHunterAroundSolidProps()
    {
        const double width = 950, height = 1550;
        var map = new WyrmrealmMapState(seed: 1204);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0], generatorPreview: true);
        foreach (var prop in terrain.Snapshot().Props)
        {
            var center = new Vector2D(prop.X * width, prop.Y * height);
            var from = center + new Vector2D(-90, 0);
            var hunter = center + new Vector2D(90, 0);
            // Pick a clear approach where it is specifically the prop that blocks
            // the direct route, not a sealed crossing or another environment feature.
            if (terrain.IsBlocked(from, width, height, 9) || terrain.IsBlocked(hunter, width, height, 9)) continue;
            if (!terrain.BlocksSegment(from, hunter, width, height, 9)) continue;
            var target = terrain.EnemyNavigationTarget(from, hunter, width, height, 9);
            if (target == hunter) continue;
            Assert.IsFalse(terrain.IsBlocked(target, width, height, 9));
            Assert.IsFalse(terrain.BlocksSegment(from, target, width, height, 9));

            var position = from;
            for (var step = 0; step < 110; step++)
            {
                var next = terrain.EnemyNavigationTarget(position, hunter, width, height, 9);
                var proposed = position + Vector2D.DirectionTo(position, next) * 4;
                position = terrain.RestrictMovement(position, proposed, width, height, 9);
                Assert.IsFalse(terrain.IsBlocked(position, width, height, 9));
            }
            Assert.IsLessThan(55, Vector2D.Distance(position, hunter), "An enemy must actually reach the hunter around a crate.");
            return;
        }
        Assert.Fail("Expected at least one unobstructed approach to a generated physical prop.");
    }

    [TestMethod]
    public void DamagePropsInRadius_DestroysOnlyNearbyPropsAndNeverCreatesDuplicateLoot()
    {
        const double width = 950, height = 1550;
        var map = new WyrmrealmMapState(seed: 1204);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0], generatorPreview: true);
        var prop = terrain.Snapshot().Props[0];
        var center = new Vector2D(prop.X * width, prop.Y * height);
        var before = terrain.Snapshot().Props.Count;
        Assert.IsGreaterThan(0, terrain.DamagePropsInRadius(center, width, height, 8, 500));
        Assert.IsFalse(terrain.Snapshot().Props.Any(p => p.Id == prop.Id));
        Assert.IsLessThan(before, terrain.Snapshot().Props.Count);
        Assert.AreEqual(0, terrain.DamagePropsInRadius(center, width, height, 0, 500));
        Assert.AreEqual(0, terrain.DamagePropsInRadius(center, width, height, 8, 0));
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
        // The camera/world dimensions are refreshed on Tick, including after a manual completion in this test.
        simulation.Tick(0, default, 390, 700);
        var exit = simulation.CreateSnapshot().Exit;
        Assert.IsNotNull(exit);

        var playerField = typeof(RunSimulation).GetField("player", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
        var player = (Wyrmforge.Domain.Combat.Player.PlayerState)playerField.GetValue(simulation)!;
        player.Position = new Vector2D(exit.X, exit.Y + exit.Radius + player.Radius - 4);
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
