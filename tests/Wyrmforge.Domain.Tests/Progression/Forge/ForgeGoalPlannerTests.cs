using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Forge;

namespace Wyrmforge.Domain.Tests.Progression.Forge;

[TestClass]
public sealed class ForgeGoalPlannerTests
{
    [TestMethod]
    public void Next_FreshForge_OffersThreeDistinctWyrmDiscoveryGoals()
    {
        var goals = ForgeGoalPlanner.Next(new ForgeProgressionState(), new DragonEssenceVault());

        Assert.AreEqual(3, goals.Count);
        Assert.AreEqual(3, goals.Select(goal => goal.Lineage).Distinct().Count());
        Assert.IsTrue(goals.All(goal => goal.Progress == 0 && !goal.ReadyToForge));
        Assert.IsTrue(goals.Any(goal => goal.Objective.Contains("Ashfang", StringComparison.Ordinal)));
    }

    [TestMethod]
    public void Next_DiscoveredLineageWithCost_ProvidesActionableReadyToForgeGoal()
    {
        var progression = new ForgeProgressionState();
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.CinderHeart);
        progression.Discover(ForgeDiscoveryContext.FromEssences(vault.SecuredEssences));

        var goals = ForgeGoalPlanner.Next(progression, vault);

        Assert.AreEqual("Ember Knowledge", goals[0].Title);
        Assert.AreEqual(1, goals[0].Progress);
        Assert.IsTrue(goals[0].ReadyToForge);
    }

    [TestMethod]
    public void Next_AfterMasterwork_FocusesOnOtherRemainingLineages()
    {
        var progression = new ForgeProgressionState();
        progression.Restore([ForgeDiscoveryId.Ashcraft]);
        progression.RestoreMasteries([ForgeMasteryId.AshEmberKnowledge, ForgeMasteryId.AshMoltenSmithing, ForgeMasteryId.AshenMasterwork]);

        var goals = ForgeGoalPlanner.Next(progression, new DragonEssenceVault());

        Assert.IsFalse(goals.Any(goal => goal.Lineage == ForgeDiscoveryId.Ashcraft));
    }

    [TestMethod]
    public void Next_WhenEverythingIsForged_HasNoInventedGoals()
    {
        var progression = new ForgeProgressionState();
        progression.Restore(ForgeDiscoveryCatalog.All.Select(discovery => discovery.Id));
        progression.RestoreMasteries(ForgeMasteryCatalog.All.Select(mastery => mastery.Id));

        Assert.AreEqual(0, ForgeGoalPlanner.Next(progression, new DragonEssenceVault()).Count);
    }
}
