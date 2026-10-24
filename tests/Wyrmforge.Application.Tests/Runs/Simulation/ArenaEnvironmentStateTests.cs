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
    public void Create_NormalHunt_GetsOnlySmallPhysicalSalvagePropsNotLabGeography()
    {
        var map = new WyrmrealmMapState(seed: 1204);
        var normal = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]).Snapshot();
        var again = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]).Snapshot();
        var lab = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0], generatorPreview: true).Snapshot();
        Assert.IsFalse(normal.GeneratorPreview);
        Assert.IsGreaterThan(0, normal.Props.Count);
        Assert.IsLessThanOrEqualTo(6, normal.Props.Count);
        Assert.IsTrue(normal.Props.All(prop => prop.Kind is "barrel" or "crate"));
        CollectionAssert.AreEqual(normal.Props.ToArray(), again.Props.ToArray());
        Assert.IsTrue(lab.GeneratorPreview);
        Assert.IsGreaterThan(normal.Props.Count, lab.Props.Count);
    }

    [TestMethod]
    public void NormalHunt_BreakBarrel_DropsSinglePhysicalCharredScrapPickup()
    {
        const int width = 950, height = 1550;
        var map = new WyrmrealmMapState(seed: 1204);
        var environment = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var prop = environment.Snapshot().Props[0];
        var at = new Vector2D(prop.X * width, prop.Y * height);
        Assert.IsTrue(environment.TryDamageProp(at, width, height, 2, 500));
        Assert.IsFalse(environment.TryDamageProp(at, width, height, 2, 500));
        var drop = environment.Snapshot().Supplies.Single(s => s.Kind == "material:CharredScrap");
        var location = new Vector2D(drop.X * width, drop.Y * height);
        Assert.AreEqual("material:CharredScrap", environment.TryCollect(location, width, height, 10, true)?.Kind);
        Assert.IsNull(environment.TryCollect(location, width, height, 10, true));
    }

    [TestMethod]
    public void IgnitePropsInRadius_RealGroundFireIgnitesWoodAndBurnsAfterTheZoneDisappears()
    {
        const int width = 950, height = 1550;
        var map = new WyrmrealmMapState(seed: 1204);
        var environment = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var first = environment.Snapshot().Props.First(prop => prop.Kind is "barrel" or "crate");
        var point = new Vector2D(first.X * width, first.Y * height);

        Assert.AreEqual(1, environment.IgnitePropsInRadius(point, width, height, 1));
        Assert.AreEqual(0, environment.IgnitePropsInRadius(point, width, height, 1),
            "One fire zone must not repeatedly restart the same prop's burn.");
        Assert.IsGreaterThan(0, environment.Snapshot().Props.Single(prop => prop.Id == first.Id).BurningSeconds);

        // The original ground patch is gone; the prop still owns fire and its
        // existing Charred Scrap pickup is created exactly once on destruction.
        Assert.AreEqual(0, environment.AdvanceBurningProps(.4));
        Assert.IsGreaterThan(0, environment.Snapshot().Props.Single(prop => prop.Id == first.Id).BurningSeconds);
        Assert.AreEqual(1, environment.AdvanceBurningProps(3));
        Assert.IsFalse(environment.Snapshot().Props.Any(prop => prop.Id == first.Id));
        Assert.AreEqual(1, environment.Snapshot().Supplies.Count(supply => supply.Kind == "material:CharredScrap"));
        environment.AdvanceBurningProps(3);
        Assert.AreEqual(1, environment.Snapshot().Supplies.Count(supply => supply.Kind == "material:CharredScrap"));
    }

    [TestMethod]
    public void IgnitePropsInRadius_ForestStoneAndSnowWoodDoNotIgnite()
    {
        const int width = 950, height = 1550;
        var map = new WyrmrealmMapState(seed: 1204);
        var forest = ArenaEnvironmentState.Create(map.Seed,
            map.AvailableNodes[0] with { Habitat = WyrmrealmHabitat.WetForest }, generatorPreview: true);
        var stone = forest.Snapshot().Props.First(prop => prop.Kind is "moss-rock" or "grave-marker" or "waystone");
        var point = new Vector2D(stone.X * width, stone.Y * height);

        Assert.AreEqual(0, forest.IgnitePropsInRadius(point, width, height, 0.1));
        Assert.AreEqual(0d, forest.Snapshot().Props.Single(prop => prop.Id == stone.Id).BurningSeconds, .00001);
    }

    [TestMethod]
    public void IgnitePropsInRadius_DistantObjectsAndNonexistentFireHaveNoEffect()
    {
        const int width = 950, height = 1550;
        var map = new WyrmrealmMapState(seed: 1204);
        var environment = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var original = environment.Snapshot().Props.ToArray();

        Assert.AreEqual(0, environment.IgnitePropsInRadius(new Vector2D(0, 0), width, height, 0));
        Assert.AreEqual(0, environment.IgnitePropsInRadius(new Vector2D(-10000, -10000), width, height, 68));
        Assert.AreEqual(0, environment.AdvanceBurningProps(4.2));
        CollectionAssert.AreEqual(original, environment.Snapshot().Props.ToArray());
    }

    [TestMethod]
    public void IgnitePropsInRadius_ProjectileDestroysBurningBarrel_StillDropsOnlyOneSalvage()
    {
        const int width = 950, height = 1550;
        var map = new WyrmrealmMapState(seed: 1204);
        var environment = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var barrel = environment.Snapshot().Props.First(prop => prop.Kind is "barrel" or "crate");
        var at = new Vector2D(barrel.X * width, barrel.Y * height);

        Assert.AreEqual(1, environment.IgnitePropsInRadius(at, width, height, 1));
        Assert.AreEqual(0, environment.AdvanceBurningProps(.1));
        Assert.IsTrue(environment.TryDamageProp(at, width, height, 1, 1000));
        Assert.IsFalse(environment.TryDamageProp(at, width, height, 1, 1000));
        Assert.AreEqual(0, environment.AdvanceBurningProps(10),
            "A destroyed object must never burn down a second time.");
        Assert.AreEqual(1, environment.Snapshot().Supplies.Count(s => s.Kind == "material:CharredScrap"));
    }

    [TestMethod]
    public void EnemyMaterialPickup_IsCollectedExactlyOnce()
    {
        const int width = 950, height = 1550;
        var map = new WyrmrealmMapState(seed: 1204);
        var environment = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var location = new Vector2D(760, 720);
        environment.SpawnMaterialPickup(location, width, height, "EmberResidue");
        Assert.AreEqual("material:EmberResidue", environment.TryCollect(location, width, height, 10, true)?.Kind);
        Assert.IsNull(environment.TryCollect(location, width, height, 10, true));
    }

    [TestMethod]
    public void Generate_SameHuntAndNode_StablePropsButDifferentSeedChangesArrangement()
    {
        var firstMap = new WyrmrealmMapState(seed: 1204);
        var secondMap = new WyrmrealmMapState(seed: 1205);
        var first = ArenaEnvironmentState.Create(firstMap.Seed, firstMap.AvailableNodes[0], generatorPreview: true).Snapshot();
        var again = ArenaEnvironmentState.Create(firstMap.Seed, firstMap.AvailableNodes[0], generatorPreview: true).Snapshot();
        var different = ArenaEnvironmentState.Create(secondMap.Seed, secondMap.AvailableNodes[0], generatorPreview: true).Snapshot();

        CollectionAssert.AreEqual(first.Props.ToArray(), again.Props.ToArray());
        Assert.IsGreaterThan(0, first.Props.Count);
        Assert.IsFalse(first.Props.SequenceEqual(different.Props));
        Assert.IsTrue(first.Props.All(prop => Vector2D.Distance(
            new Vector2D(prop.X * 950, prop.Y * 1550), new Vector2D(475, 775)) > prop.Radius + 85));
    }

    [TestMethod]
    public void WetForest_GeneratesNaturalReachableSitesWithoutForcedCrossings()
    {
        var sites = new HashSet<string>();
        var trailCenters = new HashSet<double>();
        var allProps = new List<ArenaPropRenderSnapshot>();
        for (var seed = 1204; seed < 1212; seed++)
        {
            var map = new WyrmrealmMapState(seed: seed);
            var node = map.AvailableNodes[0] with { Habitat = WyrmrealmHabitat.WetForest };
            var scene = ArenaEnvironmentState.Create(seed, node, generatorPreview: true).Snapshot();
            Assert.IsEmpty(scene.Barriers, "The lab must not impose horizontal walls or gated combat crossings.");
            Assert.IsNotNull(scene.WetForest);
            var repeated = HuntArenaGenerator.GenerateWetForest(scene.Seed);
            Assert.AreEqual(repeated.Site, scene.WetForest.Site);
            CollectionAssert.AreEqual(repeated.Trail.ToArray(), scene.WetForest.Trail.ToArray());
            CollectionAssert.AreEqual(repeated.Ground.ToArray(), scene.WetForest.Ground.ToArray());
            Assert.HasCount(9, scene.WetForest.Trail);
            Assert.IsGreaterThanOrEqualTo(40, scene.Props.Count,
                "A natural forest needs visible thickets without turning the map into a corridor.");
            sites.Add(scene.WetForest.Site);
            trailCenters.Add(scene.WetForest.Trail[4].X);
            allProps.AddRange(scene.Props);
        }
        Assert.IsGreaterThan(1, sites.Count);
        Assert.IsGreaterThan(1, trailCenters.Count);
        Assert.IsTrue(allProps.Any(p => p.X > .32 && p.X < .68),
            "The former forced vertical gap must not constrain prop placement.");
        Assert.IsTrue(allProps.Any(p => p.Y > .39 && p.Y < .61),
            "The former forced horizontal gap must not constrain prop placement.");
    }

    [TestMethod]
    public void WetForest_GenerateWideHordeGlades_LeavesFourOrMoreRealFightingOrbits()
    {
        const double width = 950, height = 1550;
        for (var seed = 1204; seed < 1220; seed++)
        {
            var recipe = HuntArenaGenerator.GenerateWetForest(seed);
            var repeated = HuntArenaGenerator.GenerateWetForest(seed);
            var clearings = recipe.Ground.Where(patch => patch.Kind == "clearing" && patch.RadiusX >= .15).ToArray();
            Assert.HasCount(5, clearings);
            CollectionAssert.AreEqual(recipe.Ground.ToArray(), repeated.Ground.ToArray());
            var props = HuntArenaGenerator.Generate(seed, WyrmrealmHabitat.WetForest, 1, false);
            Assert.IsGreaterThanOrEqualTo(40, props.Count, "Forest detail must not disappear to buy playability.");
            var playable = clearings.Count(clearing => props.All(prop =>
                Math.Pow((prop.X - clearing.X) * width, 2) +
                Math.Pow((prop.Y - clearing.Y) * height, 2) >= Math.Pow(100 + prop.Radius, 2)));
            Assert.IsGreaterThanOrEqualTo(4, playable,
                $"Seed {seed} must have at least four sizeable, unblocked 200px-diameter fighting orbits.");
            Assert.IsTrue(props.Any(p => p.Kind is "pine" or "dead-tree"),
                "Do not replace wilderness with a featureless empty combat rectangle.");
            var map = new WyrmrealmMapState(seed: seed);
            var node = map.AvailableNodes.First(candidate => candidate.Type == WyrmrealmNodeType.Combat) with
            {
                Habitat = WyrmrealmHabitat.WetForest,
            };
            var environment = ArenaEnvironmentState.Create(seed, node, generatorPreview: true);
            var snapshot = environment.Snapshot();
            Assert.IsEmpty(snapshot.Barriers);
            Assert.IsTrue(snapshot.Props.Count >= 40);
        }
    }

    [TestMethod]
    public void WyrmInfluence_ProgressesTowardLairAndKeepsRewardSchoolIndependent()
    {
        Assert.AreEqual(0, HuntArenaGenerator.WyrmInfluence(1, false));
        Assert.IsGreaterThan(HuntArenaGenerator.WyrmInfluence(1, false), HuntArenaGenerator.WyrmInfluence(3, false));
        Assert.IsGreaterThan(HuntArenaGenerator.WyrmInfluence(6, false), HuntArenaGenerator.WyrmInfluence(6, true));
        Assert.AreEqual(1, HuntArenaGenerator.WyrmInfluence(8, true));
        var first = new WyrmrealmMapState(seed: 1220);
        var snapshot = ArenaEnvironmentState.Create(first.Seed, first.AvailableNodes[0], generatorPreview: true).Snapshot();
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
