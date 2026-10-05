using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Depth;

namespace Wyrmforge.Application.Tests.Runs.Depth;

[TestClass]
public sealed class RunDepthLimitTests
{
    [TestMethod]
    public void PushDeeper_AtMaximumImplementedDepth_IsRejected()
    {
        var state = new RunDepthState();
        while (state.CanPushDeeper) Assert.IsTrue(state.PushDeeper());

        var pushed = state.PushDeeper();

        Assert.IsFalse(pushed);
        Assert.AreEqual(4, RunDepthState.MaxImplementedDepth);
        Assert.AreEqual(RunDepthState.MaxImplementedDepth, state.Depth);
        Assert.IsFalse(state.CanPushDeeper);
    }
}
