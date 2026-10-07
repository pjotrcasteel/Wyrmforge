using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Tests.Runs.Simulation.Enemies;

[TestClass]
public sealed class EnemyEncounterCompositionTests
{
    [TestMethod]
    public void CreatePlan_Swarm_SpendsBudgetOnPressureEnemies()
    {
        var profile = EnemyEncounterComposition.GetProfile(EnemyEncounterPattern.Swarm);

        var plan = EnemyEncounterComposition.CreatePlan(EnemyEncounterPattern.Swarm, 1, new FirstRandomSource());

        Assert.AreEqual(profile.BaseThreatBudget, plan.ThreatSpent);
        Assert.IsTrue(plan.Enemies.All(kind => EnemyCatalog.Get(kind).Role == EnemyRole.Pressure));
        Assert.AreEqual(0.55d, profile.SpawnIntervalMultiplier, 0.0001);
    }

    [TestMethod]
    public void CreatePlan_StalkerPressure_GuaranteesAmbusherPresence()
    {
        var profile = EnemyEncounterComposition.GetProfile(EnemyEncounterPattern.StalkerPressure);

        var plan = EnemyEncounterComposition.CreatePlan(EnemyEncounterPattern.StalkerPressure, 1, new FirstRandomSource());
        var ambushers = plan.Enemies.Count(kind => EnemyCatalog.Get(kind).Role == EnemyRole.Ambusher);

        Assert.AreEqual(profile.BaseThreatBudget, plan.ThreatSpent);
        Assert.IsTrue(ambushers >= profile.MinimumFor(EnemyRole.Ambusher));
    }

    [TestMethod]
    public void CreatePlan_ThreatMultiplier_ChangesAvailableBudgetWithoutOverspending()
    {
        var profile = EnemyEncounterComposition.GetProfile(EnemyEncounterPattern.Mixed);
        const double multiplier = 1.5;
        var expectedBudget = (int)Math.Round(profile.BaseThreatBudget * multiplier);

        var plan = EnemyEncounterComposition.CreatePlan(EnemyEncounterPattern.Mixed, 1, new FirstRandomSource(), multiplier);
        var calculatedThreat = plan.Enemies.Sum(kind => EnemyCatalog.Get(kind).ThreatCost);

        Assert.AreEqual(expectedBudget, plan.ThreatSpent);
        Assert.AreEqual(plan.ThreatSpent, calculatedThreat);
        Assert.IsTrue(plan.ThreatSpent <= expectedBudget);
    }

    [TestMethod]
    public void CreatePlan_AllEnemies_AreEligibleForRequestedDepth()
    {
        const int depth = 1;

        var plan = EnemyEncounterComposition.CreatePlan(EnemyEncounterPattern.Mixed, depth, new FirstRandomSource());

        Assert.IsTrue(plan.Enemies.All(kind => EnemyCatalog.Get(kind).MinimumDepth <= depth));
        Assert.IsFalse(plan.Enemies.Contains(EnemyKind.Brute));
    }

    [TestMethod]
    public void EnemyCatalog_Brute_BecomesEligibleFromDepthTwo()
    {
        Assert.AreEqual(2, EnemyCatalog.Get(EnemyKind.Brute).MinimumDepth);
        Assert.IsTrue(EnemyCatalog.Get(EnemyKind.Brute).ThreatCost > EnemyCatalog.Get(EnemyKind.Chaser).ThreatCost);
    }


    [TestMethod]
    public void GetSpawnBatchSize_UsesPatternSpecificRanges()
    {
        var random = new FirstRandomSource();

        Assert.AreEqual(3, EnemyEncounterComposition.GetSpawnBatchSize(EnemyEncounterPattern.Swarm, random));
        Assert.AreEqual(2, EnemyEncounterComposition.GetSpawnBatchSize(EnemyEncounterPattern.Mixed, random));
        Assert.AreEqual(1, EnemyEncounterComposition.GetSpawnBatchSize(EnemyEncounterPattern.StalkerPressure, random));
    }

    [TestMethod]
    public void GetActiveEnemyCap_IncreasesWithDepth()
    {
        Assert.AreEqual(22, EnemyEncounterComposition.GetActiveEnemyCap(1));
        Assert.AreEqual(32, EnemyEncounterComposition.GetActiveEnemyCap(2));
        Assert.AreEqual(42, EnemyEncounterComposition.GetActiveEnemyCap(3));
        Assert.AreEqual(52, EnemyEncounterComposition.GetActiveEnemyCap(4));
    }

    [TestMethod]
    public void SelectNext_NeverRepeatsPreviousPattern()
    {
        foreach (var pattern in Enum.GetValues<EnemyEncounterPattern>())
        {
            Assert.AreNotEqual(pattern, EnemyEncounterComposition.SelectNext(pattern, 0));
            Assert.AreNotEqual(pattern, EnemyEncounterComposition.SelectNext(pattern, 1));
        }
    }
}
