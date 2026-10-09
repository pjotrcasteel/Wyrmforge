using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WyrmrealmMapStateTests
{
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
    public void NewMap_OffersThreeFirstStageRoutes()
    {
        var state = new WyrmrealmMapState(seed: 1204);

        Assert.IsTrue(state.DecisionPending);
        Assert.AreEqual(3, state.AvailableNodes.Count);
        Assert.IsTrue(state.AvailableNodes.All(node => node.Stage == 1));
        Assert.IsTrue(state.AvailableNodes.All(node => node.Type == WyrmrealmNodeType.Combat));
        Assert.AreEqual(3, state.AvailableNodes.Select(node => node.AttunementSchool).Distinct().Count());
    }

    [TestMethod]
    public void Generate_SameSeed_ProducesSameGraphAndContent()
    {
        var first = new WyrmrealmMapState(2, 9917);
        var second = new WyrmrealmMapState(2, 9917);

        CollectionAssert.AreEqual(Snapshot(first).ToArray(), Snapshot(second).ToArray());
    }

    [TestMethod]
    public void GeneratedMaps_AllNodesConnectForwardAndReachDragonLayer()
    {
        for (var seed = 0; seed < 80; seed++)
        {
            var state = new WyrmrealmMapState(2, seed);
            var dragon = state.Nodes.Single(node => node.Type == WyrmrealmNodeType.Dragon);
            Assert.AreEqual(WyrmrealmMapState.CombatStages + 1, dragon.Stage);
            Assert.AreEqual(state.Nodes.Count(node => node.Stage == WyrmrealmMapState.CombatStages), dragon.PreviousNodeIds.Count);

            foreach (var node in state.Nodes.Where(node => node.Stage <= WyrmrealmMapState.CombatStages))
            {
                if (node.Stage > 1) Assert.IsTrue(node.PreviousNodeIds.Count > 0);
                Assert.IsTrue(state.Nodes.Any(next => next.Stage == node.Stage + 1 && next.PreviousNodeIds.Contains(node.Id, StringComparer.Ordinal)),
                    $"{node.Id} had no route forward for seed {seed}.");
            }
        }
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
    public void CompletingFourConnectedCombatNodes_RevealsUnknownWyrm()
    {
        var state = new WyrmrealmMapState(seed: 8021);
        for (var stage = 0; stage < WyrmrealmMapState.CombatStages; stage++)
        {
            Assert.IsNotNull(state.Choose(state.AvailableNodes[0].Id));
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

    private static void CompleteEncounter(WyrmrealmMapState state)
    {
        var killsRequired = state.CurrentNodeKillsRequired;
        for (var kill = 0; kill < killsRequired; kill++) state.RegisterKill();
    }

    private static IEnumerable<string> Snapshot(WyrmrealmMapState state) => state.Nodes.Select(node =>
        $"{node.Id}|{node.Name}|{node.Stage}|{node.Lane}|{node.Rarity}|{string.Join(',', node.PreviousNodeIds)}|{node.AttunementSchool}|{node.EncounterKind}");
}
