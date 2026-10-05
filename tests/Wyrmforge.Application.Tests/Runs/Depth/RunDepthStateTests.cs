using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Depth;

namespace Wyrmforge.Application.Tests.Runs.Depth;

[TestClass]
public sealed class RunDepthStateTests
{
    [TestMethod]
    public void NewRun_StartsAtDepthOneWithoutMultipliers()
    {
        var state = new RunDepthState();

        Assert.AreEqual(1, state.Depth);
        Assert.AreEqual(1d, state.EnemyHealthMultiplier, 0.001);
        Assert.AreEqual(1d, state.EnemySpeedMultiplier, 0.001);
        Assert.AreEqual(1d, state.SpawnIntervalMultiplier, 0.001);
        Assert.AreEqual(1d, state.ThreatBudgetMultiplier, 0.001);
        Assert.AreEqual(1d, state.ScoreMultiplier, 0.001);
        Assert.AreEqual(1d, state.DragonHealthMultiplier, 0.001);
        Assert.AreEqual(1d, state.DragonDamageMultiplier, 0.001);
    }

    [TestMethod]
    public void PushDeeper_ToDepthTwo_PreservesExistingRiskAndRewardBalance()
    {
        var state = new RunDepthState();

        var pushed = state.PushDeeper();

        Assert.IsTrue(pushed);
        Assert.AreEqual(2, state.Depth);
        Assert.AreEqual(1.35, state.EnemyHealthMultiplier, 0.001);
        Assert.AreEqual(1.15, state.EnemySpeedMultiplier, 0.001);
        Assert.AreEqual(0.8, state.SpawnIntervalMultiplier, 0.001);
        Assert.AreEqual(1d, state.ThreatBudgetMultiplier, 0.001);
        Assert.AreEqual(1.5, state.ScoreMultiplier, 0.001);
        Assert.AreEqual(1d, state.DragonHealthMultiplier, 0.001);
        Assert.AreEqual(1d, state.DragonDamageMultiplier, 0.001);
    }

    [TestMethod]
    public void PushDeeper_ToDepthFour_UsesExplicitEndOfCycleProfile()
    {
        var state = new RunDepthState();
        Assert.IsTrue(state.PushDeeper());
        Assert.IsTrue(state.PushDeeper());
        Assert.IsTrue(state.PushDeeper());

        Assert.AreEqual(4, state.Depth);
        Assert.AreEqual(2.2, state.EnemyHealthMultiplier, 0.001);
        Assert.AreEqual(1.4, state.EnemySpeedMultiplier, 0.001);
        Assert.AreEqual(0.58, state.SpawnIntervalMultiplier, 0.001);
        Assert.AreEqual(1.35, state.ThreatBudgetMultiplier, 0.001);
        Assert.AreEqual(2.8, state.ScoreMultiplier, 0.001);
        Assert.AreEqual(1.55, state.DragonHealthMultiplier, 0.001);
        Assert.AreEqual(1.25, state.DragonDamageMultiplier, 0.001);
    }
}
