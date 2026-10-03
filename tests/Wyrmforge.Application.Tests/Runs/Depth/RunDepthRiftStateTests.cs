using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Depth;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Depth;

[TestClass]
public sealed class RunDepthRiftStateTests
{
    [TestMethod]
    public void Tick_WhenEnabled_LocksTelegraphPositionAndDetonatesAfterWarning()
    {
        var state = new RunDepthRiftState();
        var lockedPosition = new Vector2D(120, 80);
        var movedPosition = new Vector2D(300, 240);

        Assert.IsFalse(state.Tick(RunDepthRiftState.InitialDelaySeconds, true, lockedPosition));
        Assert.IsTrue(state.IsTelegraphing);
        Assert.AreEqual(lockedPosition, state.Position);

        Assert.IsFalse(state.Tick(0.6, true, movedPosition));
        Assert.AreEqual(lockedPosition, state.Position);
        Assert.IsTrue(state.Tick(0.6, true, movedPosition));
        Assert.IsFalse(state.IsTelegraphing);
        Assert.AreEqual(lockedPosition, state.Position);
    }

    [TestMethod]
    public void Tick_WhenDisabled_ResetsBeforeNextDepthActivation()
    {
        var state = new RunDepthRiftState();

        Assert.IsFalse(state.Tick(RunDepthRiftState.InitialDelaySeconds, true, new Vector2D(40, 50)));
        Assert.IsTrue(state.IsTelegraphing);
        Assert.IsFalse(state.Tick(0.1, false, Vector2D.Zero));
        Assert.IsFalse(state.IsTelegraphing);

        Assert.IsFalse(state.Tick(RunDepthRiftState.InitialDelaySeconds - 0.1, true, new Vector2D(70, 90)));
        Assert.IsFalse(state.IsTelegraphing);
        Assert.IsFalse(state.Tick(0.1, true, new Vector2D(70, 90)));
        Assert.IsTrue(state.IsTelegraphing);
    }
}
