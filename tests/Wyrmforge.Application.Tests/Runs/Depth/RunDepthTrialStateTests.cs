using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Depth;

namespace Wyrmforge.Application.Tests.Runs.Depth;

[TestClass]
public sealed class RunDepthTrialStateTests
{
    [TestMethod]
    public void Start_AtDepthTwo_ActivatesCompatibilityTrial()
    {
        var state = new RunDepthTrialState();

        state.Start(RunDifficultyCatalog.Get(2));

        Assert.IsTrue(state.IsActive);
        Assert.AreEqual(0, state.Kills);
        Assert.AreEqual(12, state.KillsRequired);
        Assert.AreEqual(750, state.ScoreReward);
    }

    [TestMethod]
    public void Start_AtDepthFour_UsesDirectorTrialPressure()
    {
        var state = new RunDepthTrialState();

        state.Start(RunDifficultyCatalog.Get(4));

        Assert.IsTrue(state.IsActive);
        Assert.AreEqual(16, state.KillsRequired);
        Assert.AreEqual(1600, state.ScoreReward);
    }

    [TestMethod]
    public void RegisterKill_RequiredKill_CompletesTrialExactlyOnce()
    {
        var state = new RunDepthTrialState();
        state.Start(RunDifficultyCatalog.Get(3));

        for (var index = 0; index < state.KillsRequired - 1; index++) Assert.IsFalse(state.RegisterKill());

        Assert.IsTrue(state.RegisterKill());
        Assert.IsFalse(state.IsActive);
        Assert.AreEqual(state.KillsRequired, state.Kills);
        Assert.IsFalse(state.RegisterKill());
    }
}
