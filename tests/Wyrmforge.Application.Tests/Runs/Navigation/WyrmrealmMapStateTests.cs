using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WyrmrealmMapStateTests
{
    [TestMethod]
    public void NewMap_OffersTwoFirstStageCombatNodes()
    {
        var state = new WyrmrealmMapState(DragonCatalog.Ashfang);

        Assert.IsTrue(state.DecisionPending);
        Assert.AreEqual(2, state.AvailableNodes.Count);
        Assert.IsTrue(state.AvailableNodes.All(node => node.Stage == 1));
        Assert.IsTrue(state.AvailableNodes.All(node => node.Type == WyrmrealmNodeType.Combat));
    }

    [TestMethod]
    public void RegisterKill_TracksVisibleProgressUntilCombatNodeCompletes()
    {
        var state = new WyrmrealmMapState(DragonCatalog.Ashfang);
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
    public void CompletingFourCombatNodes_RevealsOnlyDragonTrail()
    {
        var state = new WyrmrealmMapState(DragonCatalog.Stormcoil);

        for (var stage = 0; stage < WyrmrealmMapState.CombatStages; stage++)
        {
            Assert.IsNotNull(state.Choose(state.AvailableNodes[0].Id));
            for (var kill = 0; kill < WyrmrealmMapState.KillsPerCombatNode; kill++) state.RegisterKill();
        }

        Assert.AreEqual(1, state.AvailableNodes.Count);
        Assert.AreEqual(WyrmrealmNodeType.Dragon, state.AvailableNodes[0].Type);
        Assert.AreEqual("Stormcoil", state.AvailableNodes[0].Name);
    }
}
