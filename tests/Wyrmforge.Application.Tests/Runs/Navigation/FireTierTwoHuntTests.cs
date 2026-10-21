using System.Reflection;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.Extraction;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Application.World;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Loot;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class FireTierTwoHuntTests
{
    [TestMethod]
    public void ThousandSeeds_OfferTwoForksSixToEightFightsAndOneOptionalHarderRefuge()
    {
        for (var seed = 0; seed < 1000; seed++)
        {
            var nodes = WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Ascendant);
            Assert.AreEqual(JsonSerializer.Serialize(nodes), JsonSerializer.Serialize(WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Ascendant)));
            Assert.AreEqual(nodes.Count, nodes.Select(n => n.Id).Distinct().Count());
            Assert.AreEqual(1, nodes.Count(n => n.PreviousNodeIds.Count == 0));
            var land = nodes[0].Territory!;
            Assert.AreEqual(4, land.Roads.Count);
            var boss = nodes.Single(n => n.Type == WyrmrealmNodeType.Dragon);
            Assert.AreEqual(DragonCatalog.Get(DragonId.Ashfang).Name, boss.Name);

            var refuge = nodes.Single(n => n.Refuge);
            Assert.AreEqual(WyrmrealmMapGenerator.RefugeName, refuge.Name);
            Assert.AreEqual(WyrmrealmNodeRarity.Rare, refuge.Rarity, "The refuge is the harder side quest.");
            Assert.IsNotNull(refuge.Route!.Reward.Relic);
            Assert.AreEqual(1, nodes.Count(n => n.Rarity == WyrmrealmNodeRarity.Rare));
            var clearing = nodes.Single(n => n.Id == refuge.PreviousNodeIds.Single());
            Assert.AreEqual("depth-1-clearing", clearing.Id);
            var secondFork = nodes.Where(n => n.Site!.RoadId?.StartsWith("road-1-") == true && n.Site.RoadIndex == 0).ToArray();
            Assert.AreEqual(2, secondFork.Length);
            foreach (var entrance in secondFork) CollectionAssert.AreEquivalent(new[] { clearing.Id, refuge.Id }, entrance.PreviousNodeIds.ToArray());
            CollectionAssert.AreEquivalent(secondFork.Select(n => n.Id).ToArray(),
                nodes.Where(n => n.PreviousNodeIds.Contains(refuge.Id)).Select(n => n.Id).ToArray(), "Every road beyond the refuge stays open.");

            var counts = new Dictionary<string, (int Min, int Max)>();
            var withoutRefuge = new Dictionary<string, int>();
            foreach (var node in nodes.OrderByDescending(n => n.Site!.Point.Y))
            {
                var previous = node.PreviousNodeIds.Select(id => nodes.Single(n => n.Id == id)).ToArray();
                Assert.IsTrue(previous.All(p => p.Site!.Point.Y > node.Site!.Point.Y), $"seed {seed}: every edge leads forward");
                Assert.IsTrue(node == boss || nodes.Any(next => next.PreviousNodeIds.Contains(node.Id)));
                if (node.Route is not null) Assert.AreEqual(SpellSchool.Fire, node.AttunementSchool);
                var cost = node.Type == WyrmrealmNodeType.Combat ? 1 : 0;
                counts[node.Id] = previous.Length == 0 ? (cost, cost)
                    : (cost + previous.Min(p => counts[p.Id].Min), cost + previous.Max(p => counts[p.Id].Max));
                var lawful = previous.Where(p => !p.Refuge).ToArray();
                withoutRefuge[node.Id] = node.Refuge ? 0 : cost + (lawful.Length == 0 ? 0 : lawful.Max(p => withoutRefuge[p.Id]));
                foreach (var parent in previous)
                {
                    if (parent.Site!.RoadId is not null && node.Site!.RoadId is not null)
                        Assert.AreEqual(parent.Site.RoadId, node.Site.RoadId, "A committed fork cannot collect the other road's reward.");
                    AssertDryEdge(parent.Site.Point, node.Site!.Point, land, seed);
                }
            }
            Assert.AreEqual(HuntLadder.TrailFights(WyrmTier.Ascendant), (counts[boss.Id].Min, withoutRefuge[boss.Id]));
            Assert.AreEqual(withoutRefuge[boss.Id] + 1, counts[boss.Id].Max, "Reclaiming the refuge costs exactly one extra fight.");
        }
    }

    [TestMethod]
    public void TierOneRoutes_AreUnchangedByTheTierTwoShape()
    {
        for (var seed = 0; seed < 50; seed++)
        {
            Assert.AreEqual(JsonSerializer.Serialize(WyrmrealmMapGenerator.GenerateFireTierOne(seed)),
                JsonSerializer.Serialize(WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Wyrm)));
            Assert.IsFalse(WyrmrealmMapGenerator.GenerateFireTierOne(seed).Any(n => n.Refuge));
            Assert.IsFalse(WyrmrealmMapGenerator.Generate(1, seed).Any(n => n.Refuge));
        }
    }

    [TestMethod]
    public void MapRewind_ReturnsToTheReclaimedRefugeAndReopensTheSecondFork()
    {
        var map = new WyrmrealmMapState(seed: 42, introductoryFire: true, huntTier: WyrmTier.Ascendant);
        WalkToRefuge(map);
        Assert.IsFalse(map.ReturnToRefuge("depth-1-clearing"), "Only a reclaimed refuge is a recovery point.");
        var refuge = map.AvailableNodes.Single(n => n.Refuge);
        Assert.IsFalse(map.ReturnToRefuge(refuge.Id));
        Complete(map, refuge);
        var reopened = map.AvailableNodes.Select(n => n.Id).ToArray();
        Complete(map, map.AvailableNodes[0]);
        Assert.IsNotNull(map.Choose(map.AvailableNodes[0].Id));
        Assert.IsTrue(map.ReturnToRefuge(refuge.Id));
        Assert.AreEqual(refuge.Id, map.CompletedNodes[^1].Id);
        Assert.IsNull(map.CurrentNode);
        CollectionAssert.AreEquivalent(reopened, map.AvailableNodes.Select(n => n.Id).ToArray());
    }

    [TestMethod]
    public void FallAfterRefuge_ReturnsThereLosingOnlyLaterCargoAndPayingRoutesOnce()
    {
        var simulation = Create(HuntSelection.FireTierTwo);
        var map = Field<WyrmrealmMapState>(simulation, "mapState");
        var cargo = Field<RunMaterialCargoState>(simulation, "materialCargoState");
        WalkToRefuge(map);
        cargo.Collect(HuntMaterialId.EmberResidue);
        var refuge = map.AvailableNodes.Single(n => n.Refuge);
        Complete(map, refuge);
        Invoke(simulation, "CompleteTrail", refuge);
        Resolve(simulation);
        Assert.AreEqual(refuge.Id, simulation.RefugeNodeId);

        var road = map.AvailableNodes[0];
        var scoreBeforeRoad = simulation.CreateEvaluationSummary().Score;
        Complete(map, road);
        Invoke(simulation, "CompleteTrail", road);
        Resolve(simulation);
        Assert.IsTrue(simulation.CreateEvaluationSummary().Score > scoreBeforeRoad, "The first walk pays its route reward.");
        cargo.Collect(HuntMaterialId.CharredScrap);
        while (!map.AvailableNodes.Any(n => n.Type == WyrmrealmNodeType.Dragon)) Complete(map, map.AvailableNodes[0]);
        Assert.IsNotNull(map.Choose(map.AvailableNodes.Single().Id));
        SetField(simulation, "trailExitPending", false);
        Invoke(simulation, "SpawnDragon", DragonCatalog.Get(DragonId.Ashfang), 390d, 700d);
        Assert.AreEqual(WyrmTier.Ascendant, Field<DragonState>(simulation, "dragon").Tier, "Tier II hunts the Ascendant Ashfang.");
        Invoke(simulation, "DefeatDragon", Field<DragonState>(simulation, "dragon"));
        Assert.AreEqual(0, simulation.CreateEvaluationSummary().AscendantDragonIds.Count,
            "A Tier-II win is not the Great Hunt Ascendant Rite and never grants the Crown of Embers.");
        Assert.IsTrue(simulation.ApplyDragonEssence(simulation.PendingDragonEssenceChoices[0].Id));
        Resolve(simulation);
        Assert.IsTrue(simulation.EvacuationActive);

        Field<PlayerState>(simulation, "player").Health = 0;
        simulation.Tick(.05, default, 390, 700);

        Assert.IsFalse(simulation.IsEnded);
        Assert.AreEqual(1, simulation.RefugeReturns);
        Assert.AreEqual(2, simulation.LastRefugeLoss, "The Essence and the salvage found after the refuge are lost.");
        CollectionAssert.AreEqual(new[] { HuntMaterialId.EmberResidue, HuntMaterialId.Emberglass }, cargo.Pending.ToArray(),
            "The Rare Emberglass from reclaiming the refuge is banked before the mark and survives the fall.");
        Assert.AreEqual(0, simulation.SelectedDragonEssences.Count);
        Assert.IsFalse(simulation.EvacuationActive);
        Assert.AreEqual(simulation.MaxHealth, simulation.Health);
        Assert.AreEqual(refuge.Id, simulation.CompletedMapNodes[^1].Id);
        Assert.IsTrue(simulation.AvailableMapNodes.Any(n => n.Id == road.Id));
        Assert.AreEqual(0, simulation.CreateEvaluationSummary().DragonsSlain);

        var score = simulation.CreateEvaluationSummary().Score;
        Complete(map, road);
        Invoke(simulation, "CompleteTrail", road);
        Resolve(simulation);
        Assert.AreEqual(score, simulation.CreateEvaluationSummary().Score, "A trail walked again pays no second reward.");

        SetField(simulation, "trailExitPending", false);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        Field<PlayerState>(simulation, "player").Health = 0;
        simulation.Tick(.05, default, 390, 700);
        Assert.IsFalse(simulation.IsEnded);
        Assert.AreEqual(2, simulation.RefugeReturns);
        Assert.AreEqual(2, simulation.CreateEvaluationSummary().RefugeReturns);
    }

    [TestMethod]
    public void FallBeforeTheRefugeIsReclaimed_EndsTheHuntNormally()
    {
        var simulation = Create(HuntSelection.FireTierTwo);
        var map = Field<WyrmrealmMapState>(simulation, "mapState");
        WalkToRefuge(map);
        Field<RunMaterialCargoState>(simulation, "materialCargoState").Collect(HuntMaterialId.EmberResidue);
        Assert.IsNotNull(map.Choose(map.AvailableNodes.Single(n => n.Refuge).Id));
        Field<PlayerState>(simulation, "player").Health = 0;
        simulation.Tick(.05, default, 390, 700);
        Assert.IsTrue(simulation.IsEnded);
        Assert.IsNull(simulation.RefugeNodeId);
        var summary = simulation.CreateEvaluationSummary();
        Assert.AreEqual(RunOutcome.Defeated, summary.Outcome);
        Assert.AreEqual(0, summary.SecuredMaterials.Count);
        Assert.AreEqual(0, simulation.RefugeReturns);
    }

    [TestMethod]
    public void Ladder_IsPerLineageAndOpensTierTwoOnlyAfterTierOne()
    {
        var fire = RegionCatalog.CinderFrontierId;
        Assert.IsTrue(HuntLadder.IsUnlocked(fire, WyrmTier.Wyrm, 0));
        Assert.IsFalse(HuntLadder.IsUnlocked(fire, WyrmTier.Ascendant, 0));
        Assert.IsTrue(HuntLadder.IsUnlocked(fire, WyrmTier.Ascendant, 1));
        Assert.IsFalse(HuntLadder.IsUnlocked(fire, WyrmTier.Elder, 2), "Tier III is not authored yet.");
        Assert.IsFalse(HuntLadder.IsUnlocked(RegionCatalog.FrostRegionId, WyrmTier.Wyrm, 5), "Fire progress never opens Frost tiers.");
        Assert.AreEqual(2, HuntSelection.FireTierTwo.TierNumber);
        Assert.IsTrue(HuntSelection.FireTierTwo.HasRefuge);
        Assert.IsFalse(HuntSelection.FireTierOne.HasRefuge);
        Assert.AreEqual(HuntSelection.FireTierTwo, JsonSerializer.Deserialize<HuntSelection>(JsonSerializer.Serialize(HuntSelection.FireTierTwo)));
        var simulation = Create(HuntSelection.FireTierTwo);
        Assert.AreEqual(DragonId.Ashfang, simulation.HuntTarget);
        Assert.IsFalse(simulation.CanPushDeeper);
        Assert.IsTrue(simulation.MapNodes.Any(n => n.Refuge));
        Assert.Throws<ArgumentException>(() => new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), hunt: new(fire, WyrmTier.Elder)));
    }

    [TestMethod]
    public void LootRarity_FollowsTheSelectedTierAndLegacyRunsStayCommon()
    {
        var tierOne = Create(HuntSelection.FireTierOne);
        var tierTwo = Create(HuntSelection.FireTierTwo);
        var legacy = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 42);

        Assert.IsFalse(Drops(tierOne, LootRarity.Rare), "Tier I elites never carry Emberglass.");
        Assert.IsTrue(Drops(tierOne, LootRarity.Common));
        Assert.IsTrue(Drops(tierTwo, LootRarity.Rare));
        Assert.IsFalse(Drops(tierTwo, LootRarity.Epic));
        Assert.IsFalse(Drops(legacy, LootRarity.Rare));

        Assert.AreEqual(LootRarity.Rare, tierOne.EssenceRarity);
        Assert.AreEqual(LootRarity.Epic, tierTwo.EssenceRarity);
        Assert.AreEqual(LootRarity.Epic, tierTwo.CreateEvaluationSummary().EssenceRarity);
        Assert.AreEqual(DragonEssenceVault.UngradedRarity, legacy.EssenceRarity);
    }

    [TestMethod]
    public void ReclaimingTheRefuge_PaysOneEmberglassOnlyOnce()
    {
        var simulation = Create(HuntSelection.FireTierTwo);
        var map = Field<WyrmrealmMapState>(simulation, "mapState");
        var cargo = Field<RunMaterialCargoState>(simulation, "materialCargoState");
        WalkToRefuge(map);
        var refuge = map.AvailableNodes.Single(n => n.Refuge);
        Complete(map, refuge);
        Invoke(simulation, "CompleteTrail", refuge);
        Invoke(simulation, "TrySecureRefuge", refuge);
        Assert.AreEqual(1, cargo.Pending.Count(id => id == HuntMaterialId.Emberglass));
    }

    private static bool Drops(RunSimulation simulation, LootRarity rarity) =>
        (bool)typeof(RunSimulation).GetMethod("HuntDrops", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, [rarity])!;

    [TestMethod]
    public void AscendantRite_StillRecordsTheCrownVictory()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 42, ascendantWyrm: DragonId.Ashfang);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        Invoke(simulation, "SpawnDragon", DragonCatalog.Get(DragonId.Ashfang), 390d, 700d);
        SetField(simulation, "ascendantActive", true);
        Invoke(simulation, "DefeatDragon", Field<DragonState>(simulation, "dragon"));
        CollectionAssert.AreEqual(new[] { DragonId.Ashfang }, simulation.CreateEvaluationSummary().AscendantDragonIds.ToArray());
    }

    private static RunSimulation Create(HuntSelection hunt)
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 42, hunt: hunt);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        return simulation;
    }

    private static void WalkToRefuge(WyrmrealmMapState map)
    {
        while (!map.AvailableNodes.Any(n => n.Refuge)) Complete(map, map.AvailableNodes[0]);
    }

    private static void Complete(WyrmrealmMapState map, WyrmrealmMapNode node)
    {
        Assert.IsNotNull(map.Choose(node.Id));
        for (var kill = 0; kill < map.CurrentNodeKillsRequired; kill++) map.RegisterKill(false);
        Assert.IsTrue(map.TryCompleteEncounter());
    }

    private static void Resolve(RunSimulation simulation)
    {
        while (simulation.PendingChoices.Count > 0 || simulation.PendingRelicChoices.Count > 0)
        {
            if (simulation.PendingChoices.Count > 0) Assert.IsTrue(simulation.ApplyChoice(simulation.PendingChoices[0].Id));
            else Assert.IsTrue(simulation.ApplyRelicChoice(simulation.PendingRelicChoices[0].Id));
        }
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

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void SetField(RunSimulation simulation, string name, object value) =>
        typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(simulation, value);

    private static void Invoke(RunSimulation simulation, string name, params object[] args) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, args);
}
