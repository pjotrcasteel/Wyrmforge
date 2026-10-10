using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WyrmrealmMapStateTests
{
    [TestMethod]
    public void GeneratedNodes_LeaveSeparateTouchTargetsOnNarrowPhones()
    {
        for (var seed = 0; seed < 500; seed++)
        {
            var nodes = WyrmrealmMapGenerator.Generate(1, seed).Where(n => n.Site!.RoadId is not null).ToArray();
            for (var index = 0; index < nodes.Length; index++)
            foreach (var other in nodes.Skip(index + 1))
            {
                var point = nodes[index].Site!.Point;
                var next = other.Site!.Point;
                Assert.IsTrue(Math.Abs(point.X - next.X) >= 15 || Math.Abs(point.Y - next.Y) >= 2.8,
                    $"Overlapping 48px targets at 320px width: seed {seed}, {nodes[index].Id}, {other.Id}");
            }
        }
    }

    [TestMethod]
    public void GeneratedRoads_MixEncountersAndOfferUphillCrossroadsWithoutSkippingTheReward()
    {
        var crossings = 0;
        for (var seed = 0; seed < 200; seed++)
        {
            var nodes = WyrmrealmMapGenerator.Generate(1, seed);
            foreach (var road in nodes.Where(n => n.Site!.RoadId is not null).GroupBy(n => n.Site!.RoadId))
                Assert.IsTrue(road.Select(n => n.EncounterKind).Distinct().Count() >= 2);
            foreach (var node in nodes.Where(n => n.Site!.RoadId is not null))
            foreach (var previous in node.PreviousNodeIds.Select(id => nodes.Single(n => n.Id == id)))
            {
                if (previous.Site!.RoadId is null || previous.Site.RoadId == node.Site!.RoadId) continue;
                crossings++;
                Assert.IsTrue(node.Site.Point.Y < previous.Site.Point.Y);
                Assert.AreEqual(previous.Site.RoadIndex + 1, node.Site.RoadIndex);
                var reward = nodes.SingleOrDefault(n => n.Site!.RoadId == node.Site.RoadId && n.Site.BonusRelic);
                if (reward is not null) Assert.IsTrue(node.Site.RoadIndex <= reward.Site!.RoadIndex);
            }
        }
        Assert.IsGreaterThan(200, crossings);
    }

    [TestMethod]
    public void Generate_DepthOne_AlwaysOffersRecoveryWhileDeeperRoutesKeepTheirVariety()
    {
        var deeperRecovery = new HashSet<double>();
        for (var seed = 0; seed < 80; seed++)
        {
            foreach (var node in WyrmrealmMapGenerator.Generate(1, seed).Where(node => node.Type == WyrmrealmNodeType.Combat))
            {
                Assert.AreEqual(node.Rarity == WyrmrealmNodeRarity.Rare ? 0.12 : 0.10, node.Route!.Reward.RecoveryFraction);
            }
            foreach (var node in WyrmrealmMapGenerator.Generate(2, seed).Where(node => node.Type == WyrmrealmNodeType.Combat))
            {
                deeperRecovery.Add(node.Route!.Reward.RecoveryFraction);
            }
        }
        Assert.IsTrue(deeperRecovery.Contains(0));
        Assert.IsTrue(deeperRecovery.Any(recovery => recovery is >= 0.05 and <= 0.09));
        Assert.IsTrue(deeperRecovery.Contains(0.12));
    }

    [TestMethod]
    public void Generate_SeededTerritories_OfferTwoToFourRoadsWithAShortOptionAndRewardEveryLongDetour()
    {
        var signatures = new HashSet<string>();
        var longRoads = 0;
        for (var seed = 0; seed < 500; seed++)
        {
            var nodes = WyrmrealmMapGenerator.Generate(1, seed);
            var land = nodes[0].Territory!;
            signatures.Add(string.Join("|", nodes.Select(n => $"{n.Id}:{n.Site!.Point}")));
            Assert.AreEqual(8, MinimumFights(nodes, nodes.Single(n => n.Type == WyrmrealmNodeType.Dragon)));
            foreach (var fork in nodes.Where(n => n.Site!.RoadId is null && nodes.Count(next => next.PreviousNodeIds.Contains(n.Id)) > 1))
            {
                var next = nodes.Where(n => n.PreviousNodeIds.Contains(fork.Id)).ToArray();
                Assert.IsTrue(next.Length is >= 2 and <= 4);
                Assert.AreEqual(next.Length, next.Select(n => n.AttunementSchool).Distinct().Count());
                Assert.IsTrue(next.Select(n => land.Roads.Single(r => r.Id == n.Site!.RoadId).Length).Distinct().Count() >= 2);
                Assert.IsTrue(next.Any(n => land.Roads.Single(r => r.Id == n.Site!.RoadId).Length == "Short"));
            }
            foreach (var road in land.Roads)
            {
                var stops = nodes.Where(n => n.Site!.RoadId == road.Id).ToArray();
                Assert.AreEqual(road.Encounters, stops.Length);
                if (!road.BonusRelic) continue;
                longRoads++;
                var reward = stops.Single(n => n.Site!.BonusRelic);
                Assert.IsNotNull(reward.Route!.Reward.Relic);
                Assert.IsTrue(stops.Length > 3);
            }
            foreach (var node in nodes)
            {
                Assert.IsTrue(node.Site!.Point.X is >= 4 and <= 96);
                Assert.IsTrue(node.Site.Point.Y is >= 3 and <= 96);
                if (node.Type != WyrmrealmNodeType.Dragon) Assert.IsTrue(nodes.Any(n => n.PreviousNodeIds.Contains(node.Id)));
            }
        }
        Assert.AreEqual(500, signatures.Count);
        Assert.IsGreaterThan(0, longRoads);
    }

    [TestMethod]
    public void NewMap_StartsOnTheSharedApproachBeforeRoadChoices()
    {
        var state = new WyrmrealmMapState(seed: 1204);
        Assert.IsTrue(state.DecisionPending);
        Assert.AreEqual(1, state.AvailableNodes.Count);
        Assert.AreEqual(1, state.AvailableNodes[0].Stage);
    }

    [TestMethod]
    public void Generate_SameSeed_ProducesSameGraphAndContent()
    {
        var first = new WyrmrealmMapState(2, 9917);
        var second = new WyrmrealmMapState(2, 9917);

        CollectionAssert.AreEqual(Snapshot(first).ToArray(), Snapshot(second).ToArray());
    }

    [TestMethod]
    public void GeneratedMaps_RoadsStayOnDryGroundAndMountainFeaturesDoNotCoverTrails()
    {
        for (var seed = 0; seed < 200; seed++)
        {
            var nodes = WyrmrealmMapGenerator.Generate(2, seed);
            var land = nodes[0].Territory!;
            foreach (var road in land.Roads)
            {
                foreach (var edge in road.Points.Zip(road.Points.Skip(1)))
                {
                    for (var step = 0; step <= 20; step++)
                    {
                        var t = step / 20d;
                        var point = WyrmrealmMapGenerator.TrailPoint(edge.First, edge.Second, t);
                        var x = point.X;
                        var y = point.Y;
                        Assert.IsTrue(Math.Abs(x - WyrmrealmMapGenerator.RiverX(land.River, y)) > 3, $"River collision: {seed}");
                        foreach (var hill in land.Features.Where(f => f.Kind is "mountain" or "forest" or "rocks"))
                        {
                            var distance = Math.Pow((x - hill.Center.X) / hill.RadiusX, 2) + Math.Pow((y - hill.Center.Y) / hill.RadiusY, 2);
                            Assert.IsTrue(distance > 1, $"Ridge collision: {seed}");
                        }
                    }
                }
            }
        }
    }

    [TestMethod]
    public void Generate_SceneryFootprints_LeaveRiverbanksClearAndDoNotOverlap()
    {
        var kinds = new HashSet<string>();
        for (var seed = 0; seed < 200; seed++)
        {
            var land = WyrmrealmMapGenerator.Generate(1, seed)[0].Territory!;
            var scenery = land.Features.Where(f => f.Kind is "mountain" or "forest" or "rocks").ToArray();
            foreach (var feature in scenery)
            {
                kinds.Add(feature.Kind);
                for (var sample = -1; sample <= 1; sample++)
                {
                    var water = WyrmrealmMapGenerator.RiverX(land.River, feature.Center.Y + sample * feature.RadiusY);
                    Assert.IsTrue(Math.Abs(feature.Center.X - water) > feature.RadiusX + 3, $"Scenery covers water: {seed}");
                }
                foreach (var other in land.Features.Where(f => f != feature && f.Kind is "mountain" or "forest" or "rocks" or "ruins"))
                {
                    var distance = Math.Pow((feature.Center.X - other.Center.X) / (feature.RadiusX + other.RadiusX), 2)
                        + Math.Pow((feature.Center.Y - other.Center.Y) / (feature.RadiusY + other.RadiusY), 2);
                    Assert.IsTrue(distance > 1, $"Scenery overlaps another landmark: {seed}");
                }
            }
            var lair = land.Features.Single(f => f.Kind is "ridge" or "volcano");
            Assert.AreEqual(5d, lair.Center.Y);
        }
        CollectionAssert.AreEquivalent(new[] { "mountain", "forest", "rocks" }, kinds.ToArray());
    }

    [TestMethod]
    public void RegisterKill_AfterChoosingNode_OnlyOffersConnectedNextNodes()
    {
        var state = new WyrmrealmMapState(seed: 4312);
        var chosen = state.Choose(state.AvailableNodes[0].Id)!;
        CompleteEncounter(state);

        var expected = state.Nodes.Where(node => node.PreviousNodeIds.Contains(chosen.Id, StringComparer.Ordinal)).Select(node => node.Id).OrderBy(id => id).ToArray();
        var actual = state.AvailableNodes.Select(node => node.Id).OrderBy(id => id).ToArray();
        CollectionAssert.AreEqual(expected, actual);
        Assert.IsTrue(actual.Length > 0);
    }

    [TestMethod]
    public void GeneratedMap_WhenRareTrailExists_HasMultipleIncomingPathsAndPremiumReward()
    {
        var state = Enumerable.Range(0, 200).Select(seed => new WyrmrealmMapState(2, seed)).First(map => map.Nodes.Any(node => node.Rarity == WyrmrealmNodeRarity.Rare));
        var rare = state.Nodes.Single(node => node.Rarity == WyrmrealmNodeRarity.Rare);

        Assert.IsTrue(rare.PreviousNodeIds.Count >= 2);
        Assert.IsNotNull(rare.Route?.Reward.Relic);
        Assert.IsTrue(rare.Route!.ModifierSet.TryGetHazardInterval(WyrmrealmHazardKind.UnstableRifts, out _));
        Assert.IsTrue(rare.Route.Reward.RecoveryFraction >= 0.1);
    }

    [TestMethod]
    public void CompletingEightShortestRoadCombatNodes_RevealsUnknownWyrm()
    {
        var state = new WyrmrealmMapState(seed: 8021);
        for (var stage = 0; stage < WyrmrealmMapState.CombatStages; stage++)
        {
            Assert.IsNotNull(state.Choose(state.AvailableNodes.OrderBy(n => n.Site!.RoadId is null ? 0 : n.Territory!.Roads.Single(r => r.Id == n.Site.RoadId).Encounters).First().Id));
            CompleteEncounter(state);
        }

        Assert.AreEqual(1, state.AvailableNodes.Count);
        Assert.AreEqual(WyrmrealmNodeType.Dragon, state.AvailableNodes[0].Type);
        Assert.AreEqual("Unknown Wyrm", state.AvailableNodes[0].Name);
        Assert.IsNull(state.AvailableNodes[0].Route);
    }

    [TestMethod]
    public void RegisterKill_PhasesNotFinished_StoresQuotaWithoutCompletingOrDuplicatingRewards()
    {
        var state = new WyrmrealmMapState(seed: 1);
        state.Choose(state.AvailableNodes[0].Id);
        var required = state.CurrentNodeKillsRequired;
        for (var kill = 0; kill < required + 5; kill++) Assert.IsFalse(state.RegisterKill(false));
        Assert.AreEqual(required, state.CurrentNodeKills);
        Assert.IsFalse(state.DecisionPending);
        Assert.IsTrue(state.TryCompleteEncounter());
        Assert.IsFalse(state.TryCompleteEncounter());
        Assert.AreEqual(1, state.CompletedNodes.Count);
    }

    private static int MinimumFights(IReadOnlyList<WyrmrealmMapNode> nodes, WyrmrealmMapNode node)
        => (node.Type == WyrmrealmNodeType.Combat ? 1 : 0) + (node.PreviousNodeIds.Count == 0 ? 0
            : node.PreviousNodeIds.Min(id => MinimumFights(nodes, nodes.Single(n => n.Id == id))));

    private static void CompleteEncounter(WyrmrealmMapState state)
    {
        var killsRequired = state.CurrentNodeKillsRequired;
        for (var kill = 0; kill < killsRequired; kill++) state.RegisterKill();
    }

    private static IEnumerable<string> Snapshot(WyrmrealmMapState state) => state.Nodes.Select(node =>
        $"{node.Id}|{node.Name}|{node.Stage}|{node.Lane}|{node.Rarity}|{string.Join(',', node.PreviousNodeIds)}|{node.AttunementSchool}|{node.EncounterKind}");
}
