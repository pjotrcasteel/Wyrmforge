using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Depth;

namespace Wyrmforge.Application.Tests.Runs.Depth;

[TestClass]
public sealed class RunDepthLimitTests
{
    [TestMethod]
    public void PushDeeper_AtMaximumImplementedDepth_IsRejectedAndDecisionRemains()
    {
        var state = new RunDepthState();
        state.OfferDecision();
        Assert.IsTrue(state.PushDeeper());
        state.OfferDecision();

        var pushed = state.PushDeeper();

        Assert.IsFalse(pushed);
        Assert.AreEqual(RunDepthState.MaxImplementedDepth, state.Depth);
        Assert.IsTrue(state.DecisionPending);
        Assert.IsFalse(state.CanPushDeeper);
    }
}
