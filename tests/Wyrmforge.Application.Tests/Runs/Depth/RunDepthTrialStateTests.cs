using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Depth;

namespace Wyrmforge.Application.Tests.Runs.Depth;

[TestClass]
public sealed class RunDepthTrialStateTests
{
    [TestMethod]
    public void Start_AtDepthTwo_ActivatesFreshTrial()
    {
        var state = new RunDepthTrialState();

        state.Start(2);

        Assert.IsTrue(state.IsActive);
        Assert.AreEqual(0, state.Kills);
        Assert.AreEqual(12, RunDepthTrialState.KillsRequired);
        Assert.AreEqual(750, RunDepthTrialState.ScoreReward);
    }

    [TestMethod]
    public void RegisterKill_TwelfthKill_CompletesTrialExactlyOnce()
    {
        var state = new RunDepthTrialState();
        state.Start(2);

        for (var index = 0; index < RunDepthTrialState.KillsRequired - 1; index++) Assert.IsFalse(state.RegisterKill());

        Assert.IsTrue(state.RegisterKill());
        Assert.IsFalse(state.IsActive);
        Assert.AreEqual(RunDepthTrialState.KillsRequired, state.Kills);
        Assert.IsFalse(state.RegisterKill());
    }
}
