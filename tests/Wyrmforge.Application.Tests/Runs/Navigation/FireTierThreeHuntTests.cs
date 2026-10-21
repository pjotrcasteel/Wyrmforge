using System.Reflection;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Progression.Loot;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class FireTierThreeHuntTests
{
    [TestMethod]
    public void ThousandSeeds_OfferThreeForksTenToThirteenFightsARefugeAndAWatchtower()
    {
        for (var seed = 0; seed < 1000; seed++)
        {
            var nodes = WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Elder);
            Assert.AreEqual(JsonSerializer.Serialize(nodes), JsonSerializer.Serialize(WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Elder)));
            Assert.AreEqual(nodes.Count, nodes.Select(n => n.Id).Distinct().Count());
            Assert.AreEqual(1, nodes.Count(n => n.PreviousNodeIds.Count == 0));
            var land = nodes[0].Territory!;
            Assert.AreEqual(2, land.Roads.Count(r => r.Id.StartsWith("road-0-")));
            Assert.IsTrue(land.Roads.Count(r => r.Id.StartsWith("road-1-")) is 2 or 3);
            Assert.IsTrue(land.Roads.Count(r => r.Id.StartsWith("road-2-")) is 2 or 3);
            var boss = nodes.Single(n => n.Type == WyrmrealmNodeType.Dragon);
            Assert.AreEqual(DragonCatalog.Get(DragonId.Ashfang).Name, boss.Name);

            var refuge = nodes.Single(n => n.Refuge);
            Assert.AreEqual("depth-1-clearing", refuge.PreviousNodeIds.Single());
            AssertRejoinsEveryRoad(nodes, refuge, "road-1-");
            var tower = nodes.Single(n => n.Watchtower);
            Assert.AreEqual(WyrmrealmMapGenerator.WatchtowerName, tower.Name);
            Assert.AreEqual("Take the watchtower", tower.EncounterName);
            Assert.AreEqual(WyrmrealmNodeRarity.Common, tower.Rarity, "The lookout costs a fight, not a harder hold.");
            Assert.AreEqual("depth-1-crossroads", tower.PreviousNodeIds.Single());
            AssertRejoinsEveryRoad(nodes, tower, "road-2-");
            Assert.AreEqual(1, nodes.Count(n => n.Rarity == WyrmrealmNodeRarity.Rare), "The refuge stays the only rare site.");

            var counts = new Dictionary<string, (int Min, int Max)>();
            var withoutSides = new Dictionary<string, int>();
            foreach (var node in nodes.OrderByDescending(n => n.Site!.Point.Y))
            {
                var previous = node.PreviousNodeIds.Select(id => nodes.Single(n => n.Id == id)).ToArray();
                Assert.IsTrue(previous.All(p => p.Site!.Point.Y > node.Site!.Point.Y), $"seed {seed}: every edge leads forward");
                Assert.IsTrue(node == boss || nodes.Any(next => next.PreviousNodeIds.Contains(node.Id)));
                if (node.Route is not null) Assert.AreEqual(SpellSchool.Fire, node.AttunementSchool);
                var cost = node.Type == WyrmrealmNodeType.Combat ? 1 : 0;
                counts[node.Id] = previous.Length == 0 ? (cost, cost)
                    : (cost + previous.Min(p => counts[p.Id].Min), cost + previous.Max(p => counts[p.Id].Max));
                var lawful = previous.Where(p => !p.Refuge && !p.Watchtower).ToArray();
                withoutSides[node.Id] = node.Refuge || node.Watchtower ? 0 : cost + (lawful.Length == 0 ? 0 : lawful.Max(p => withoutSides[p.Id]));
                foreach (var parent in previous)
                {
                    if (parent.Site!.RoadId is not null && node.Site!.RoadId is not null)
                        Assert.AreEqual(parent.Site.RoadId, node.Site.RoadId, "A committed fork cannot collect the other road's reward.");
                    AssertDryEdge(parent.Site.Point, node.Site!.Point, land, seed);
                }
            }
            Assert.AreEqual(HuntLadder.TrailFights(WyrmTier.Elder), (counts[boss.Id].Min, withoutSides[boss.Id]));
            Assert.AreEqual(withoutSides[boss.Id] + 2, counts[boss.Id].Max, "The refuge and the watchtower each cost exactly one extra fight.");
        }
    }

    [TestMethod]
    public void TierThree_OpensOnlyAfterTierTwoAndIsAuthoredForFireOnly()
    {
        var fire = Wyrmforge.Application.World.RegionCatalog.CinderFrontierId;
        Assert.IsTrue(HuntLadder.IsAuthored(fire, WyrmTier.Elder));
        Assert.IsFalse(HuntLadder.IsUnlocked(fire, WyrmTier.Elder, 1));
        Assert.IsTrue(HuntLadder.IsUnlocked(fire, WyrmTier.Elder, 2));
        Assert.IsFalse(HuntLadder.IsAuthored(fire, WyrmTier.Primordial));
        Assert.IsFalse(HuntLadder.IsAuthored(Wyrmforge.Application.World.RegionCatalog.FrostRegionId, WyrmTier.Elder));
        Assert.IsTrue(HuntSelection.FireTierThree.HasRefuge);
        Assert.IsTrue(HuntSelection.FireTierThree.HasWatchtower);
        Assert.IsFalse(HuntSelection.FireTierTwo.HasWatchtower);
        Assert.IsFalse(WyrmrealmMapGenerator.GenerateFireHunt(7, WyrmTier.Ascendant).Any(n => n.Watchtower));
    }

    [TestMethod]
    public void TierThree_HuntsElderAshfangWithItsOwnProfileAndNoCrown()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 42, hunt: HuntSelection.FireTierThree);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        Invoke(simulation, "SpawnDragon", DragonCatalog.Get(DragonId.Ashfang), 390d, 700d);
        var dragon = Field<DragonState>(simulation, "dragon");
        Assert.AreEqual(WyrmTier.Elder, dragon.Tier);
        Assert.AreSame(DragonHuntCatalog.ElderAshfang, Field<DragonHuntState>(simulation, "dragonHuntState").Profile);
        var snapshot = (DragonRenderSnapshot)typeof(RunSimulation).GetMethod("CreateDragonSnapshot", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, [])!;
        Assert.AreEqual("Elder Ashfang", snapshot.Name);
        Invoke(simulation, "DefeatDragon", dragon);
        Assert.AreEqual(0, simulation.CreateEvaluationSummary().AscendantDragonIds.Count, "The Crown of Embers is earned only through the rite.");
    }

    [TestMethod]
    public void Watchtower_ReportsExactlyTheElitesTheNextForkWillRoll()
    {
        int elites = 0, quiet = 0;
        for (var seed = 1; seed <= 80; seed++)
        {
            var scout = Create(seed);
            WalkTo(scout, node => node.Watchtower);
            var reports = scout.ScoutReports;
            var roads = reports.Keys.Select(id => Map(scout).Nodes.Single(n => n.Id == id).Site!.RoadId!).Distinct().ToArray();
            Assert.IsTrue(roads.Length is 2 or 3, $"seed {seed}: the tower scouts every road of the last fork");
            foreach (var road in roads)
            {
                var walker = Create(seed);
                WalkTo(walker, node => node.Watchtower);
                foreach (var trail in Map(walker).Nodes.Where(n => n.Site?.RoadId == road).OrderBy(n => n.Site!.RoadIndex))
                {
                    var report = reports[trail.Id];
                    Assert.IsTrue(walker.ChooseMapNode(trail.Id));
                    var spawnIndex = Field<int>(walker, "eliteSpawnIndex");
                    Assert.AreEqual(report.Elite, spawnIndex > 0, $"seed {seed} {trail.Id}: elite report");
                    if (report.Elite) Assert.AreEqual(RunSimulation.EliteEarliestSpawn, spawnIndex, "A confirmed elite arrives early.");
                    if (spawnIndex > 0) SetField(walker, "elitesThisMap", Field<int>(walker, "elitesThisMap") + 1);
                    Finish(walker, trail);
                    elites += report.Elite ? 1 : 0;
                    quiet += report.Elite ? 0 : 1;
                }
            }
        }
        Assert.IsTrue(elites > 0 && quiet > 0, $"elites {elites}, quiet {quiet}");
    }

    [TestMethod]
    public void WithoutTheWatchtower_NothingIsRevealed_AndARefugeReturnForgetsIt()
    {
        var skipper = Create(9);
        WalkTo(skipper, node => node.Type == WyrmrealmNodeType.Dragon, avoidTower: true);
        Assert.AreEqual(0, skipper.ScoutReports.Count);

        var faller = Create(9);
        WalkTo(faller, node => node.Refuge);
        WalkTo(faller, node => node.Watchtower);
        Assert.IsTrue(faller.ScoutReports.Count > 0);
        Invoke(faller, "TryReturnToRefuge");
        Assert.AreEqual(0, faller.ScoutReports.Count, "The rewind undoes the tower, so its report is gone.");
        WalkTo(faller, node => node.Watchtower);
        Assert.IsTrue(faller.ScoutReports.Count > 0, "The tower can be held again.");
    }

    [TestMethod]
    public void TierThreeElites_AlsoCarryEpicWyrmcinder_TierTwoElitesDoNot()
    {
        CollectionAssert.AreEqual(new[] { "material:Emberglass" }, EliteDrops(HuntSelection.FireTierTwo));
        CollectionAssert.AreEqual(new[] { "material:Emberglass", "material:Wyrmcinder" }, EliteDrops(HuntSelection.FireTierThree));
        Assert.AreEqual(LootRarity.Epic, HuntMaterialCatalog.Rarity(HuntMaterialId.Wyrmcinder));
    }

    private static string[] EliteDrops(HuntSelection hunt)
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 9, hunt: hunt);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        Assert.IsTrue(simulation.ChooseMapNode(Map(simulation).AvailableNodes[0].Id));
        var elite = new EnemyState(900, new Vector2D(200, 300), 11, 40, 0, EnemyKind.Hollow) { Elite = EliteAffix.Gravebound };
        Invoke(simulation, "DamageTarget", elite, 1000d, null!, null!);
        return Field<ArenaEnvironmentState>(simulation, "arenaEnvironment").Snapshot().Supplies
            .Select(supply => supply.Kind).Where(kind => kind.StartsWith("material:") && kind != "material:CharredScrap").ToArray();
    }

    private static RunSimulation Create(int seed)
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: seed, hunt: HuntSelection.FireTierThree);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        return simulation;
    }

    private static WyrmrealmMapState Map(RunSimulation simulation) => Field<WyrmrealmMapState>(simulation, "mapState");

    /// <summary>Clears trails until the target is complete, taking side sites and the first road otherwise.</summary>
    private static void WalkTo(RunSimulation simulation, Func<WyrmrealmMapNode, bool> target, bool avoidTower = false)
    {
        while (true)
        {
            var available = Map(simulation).AvailableNodes;
            var next = available.FirstOrDefault(target) ?? available.Where(n => !n.Refuge && !(avoidTower && n.Watchtower)).First();
            if (next.Type == WyrmrealmNodeType.Dragon) return;
            Assert.IsTrue(simulation.ChooseMapNode(next.Id));
            Finish(simulation, next);
            if (target(next)) return;
        }
    }

    private static void Finish(RunSimulation simulation, WyrmrealmMapNode node)
    {
        var map = Map(simulation);
        for (var kill = 0; kill < map.CurrentNodeKillsRequired; kill++) map.RegisterKill(false);
        Assert.IsTrue(map.TryCompleteEncounter());
        Invoke(simulation, "CompleteTrail", node);
        SetField(simulation, "trailExitPending", false);
    }

    private static void SetField(RunSimulation simulation, string name, object value) =>
        typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(simulation, value);

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void Invoke(RunSimulation simulation, string name, params object[] args) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, args);

    private static void AssertRejoinsEveryRoad(IReadOnlyList<WyrmrealmMapNode> nodes, WyrmrealmMapNode side, string roadPrefix)
    {
        var hub = side.PreviousNodeIds.Single();
        var entrances = nodes.Where(n => n.Site!.RoadId?.StartsWith(roadPrefix) == true && n.Site.RoadIndex == 0).ToArray();
        foreach (var entrance in entrances) CollectionAssert.AreEquivalent(new[] { hub, side.Id }, entrance.PreviousNodeIds.ToArray());
        CollectionAssert.AreEquivalent(entrances.Select(n => n.Id).ToArray(),
            nodes.Where(n => n.PreviousNodeIds.Contains(side.Id)).Select(n => n.Id).ToArray(), "Every road beyond a side site stays open.");
    }

    private static void AssertDryEdge(HuntPoint start, HuntPoint end, WyrmrealmTerritory land, int seed)
    {
        for (var step = 0; step <= 40; step++)
        {
            var point = WyrmrealmMapGenerator.TrailPoint(start, end, step / 40d);
            Assert.IsTrue(Math.Abs(point.X - WyrmrealmMapGenerator.RiverX(land.River, point.Y)) > 3, $"seed {seed}: road crosses water");
            foreach (var hill in land.Features.Where(f => f.Kind is "mountain" or "forest" or "rocks"))
                Assert.IsTrue(Math.Pow((point.X - hill.Center.X) / hill.RadiusX, 2) + Math.Pow((point.Y - hill.Center.Y) / hill.RadiusY, 2) > 1,
                    $"seed {seed}: scenery blocks a graph edge");
        }
    }
}
