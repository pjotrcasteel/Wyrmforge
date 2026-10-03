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
        Assert.IsFalse(state.DecisionPending);
        Assert.AreEqual(1d, state.EnemyHealthMultiplier, 0.001);
        Assert.AreEqual(1d, state.EnemySpeedMultiplier, 0.001);
        Assert.AreEqual(1d, state.SpawnIntervalMultiplier, 0.001);
        Assert.AreEqual(1d, state.ScoreMultiplier, 0.001);
    }

    [TestMethod]
    public void PushDeeper_AfterDecision_IncreasesRiskAndReward()
    {
        var state = new RunDepthState();
        state.OfferDecision();

        var pushed = state.PushDeeper();

        Assert.IsTrue(pushed);
        Assert.AreEqual(2, state.Depth);
        Assert.IsFalse(state.DecisionPending);
        Assert.AreEqual(1.35, state.EnemyHealthMultiplier, 0.001);
        Assert.AreEqual(1.15, state.EnemySpeedMultiplier, 0.001);
        Assert.AreEqual(0.8, state.SpawnIntervalMultiplier, 0.001);
        Assert.AreEqual(1.5, state.ScoreMultiplier, 0.001);
    }

    [TestMethod]
    public void Extract_AfterDecision_DoesNotIncreaseDepth()
    {
        var state = new RunDepthState();
        state.OfferDecision();

        var extracted = state.Extract();

        Assert.IsTrue(extracted);
        Assert.AreEqual(1, state.Depth);
        Assert.IsFalse(state.DecisionPending);
    }
}
