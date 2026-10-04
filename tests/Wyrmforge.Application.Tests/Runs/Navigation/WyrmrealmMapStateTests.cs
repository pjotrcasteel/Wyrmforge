using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WyrmrealmMapStateTests
{
    [TestMethod]
    public void NewMap_OffersTwoFirstStageCombatNodesWithDifferentRouteProfiles()
    {
        var state = new WyrmrealmMapState();

        Assert.IsTrue(state.DecisionPending);
        Assert.AreEqual(2, state.AvailableNodes.Count);
        Assert.IsTrue(state.AvailableNodes.All(node => node.Stage == 1));
        Assert.IsTrue(state.AvailableNodes.All(node => node.Type == WyrmrealmNodeType.Combat));
        Assert.IsTrue(state.AvailableNodes.All(node => node.Route is not null));
        Assert.AreEqual(2, state.AvailableNodes.Select(node => node.AttunementSchool).Distinct().Count());
        Assert.AreNotEqual(state.AvailableNodes[0].Route!.Encounter.SpawnIntervalMultiplier, state.AvailableNodes[1].Route!.Encounter.SpawnIntervalMultiplier);
        Assert.AreNotEqual(state.AvailableNodes[0].Route!.Reward, state.AvailableNodes[1].Route!.Reward);
    }

    [TestMethod]
    public void NewMap_AtDepthTwo_OffersFreshRoutesWithDifferentHazardTradeoffs()
    {
        var state = new WyrmrealmMapState(2);

        Assert.AreEqual(2, state.Depth);
        Assert.IsTrue(state.DecisionPending);
        Assert.AreEqual(2, state.AvailableNodes.Count);
        Assert.IsTrue(state.AvailableNodes.All(node => node.Id.StartsWith("depth-2-", StringComparison.Ordinal)));
        Assert.AreEqual("Ashen Fall", state.AvailableNodes[0].Name);
        Assert.AreEqual("Stormglass Rift", state.AvailableNodes[1].Name);
        Assert.IsNotNull(state.AvailableNodes[0].Route?.Hazard);
        Assert.IsNotNull(state.AvailableNodes[1].Route?.Hazard);
        Assert.AreNotEqual(state.AvailableNodes[0].Route!.Hazard!.IntervalMultiplier, state.AvailableNodes[1].Route!.Hazard!.IntervalMultiplier);
    }

    [TestMethod]
    public void RegisterKill_TracksVisibleProgressUntilCombatNodeCompletes()
    {
        var state = new WyrmrealmMapState();
        var chosen = state.Choose(state.AvailableNodes[0].Id);

        Assert.IsNotNull(chosen);
        for (var kill = 1; kill < WyrmrealmMapState.KillsPerCombatNode; kill++)
        {
            Assert.IsFalse(state.RegisterKill());
            Assert.AreEqual(kill, state.CurrentNodeKills);
        }

        Assert.IsTrue(state.RegisterKill());
        Assert.AreEqual(0, state.CurrentNodeKills);
        Assert.IsTrue(state.DecisionPending);
        Assert.AreEqual(1, state.CompletedNodes.Count);
        Assert.AreEqual(2, state.AvailableNodes.Count);
        Assert.IsTrue(state.AvailableNodes.All(node => node.Stage == 2));
    }

    [TestMethod]
    public void CompletingFourCombatNodes_RevealsUnknownDragonTrailWithoutRouteProfile()
    {
        var state = new WyrmrealmMapState();

        for (var stage = 0; stage < WyrmrealmMapState.CombatStages; stage++)
        {
            Assert.IsNotNull(state.Choose(state.AvailableNodes[0].Id));
            for (var kill = 0; kill < WyrmrealmMapState.KillsPerCombatNode; kill++) state.RegisterKill();
        }

        Assert.AreEqual(1, state.AvailableNodes.Count);
        Assert.AreEqual(WyrmrealmNodeType.Dragon, state.AvailableNodes[0].Type);
        Assert.AreEqual("Unknown Wyrm", state.AvailableNodes[0].Name);
        Assert.IsNull(state.AvailableNodes[0].Route);
        Assert.IsNull(state.AvailableNodes[0].AttunementSchool);
    }
}
