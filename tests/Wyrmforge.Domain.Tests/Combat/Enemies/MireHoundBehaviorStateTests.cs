using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Tests.Combat.Enemies;

[TestClass]
public sealed class MireHoundBehaviorStateTests
{
    [TestMethod]
    public void Tick_WhenCooldownExpires_StartsWindupAndLocksDirection()
    {
        var state = new MireHoundBehaviorState();
        var started = state.Tick(MireHoundBehaviorState.InitialCooldownSeconds, Vector2D.Zero, new Vector2D(100, 0));

        Assert.IsTrue(started);
        Assert.IsTrue(state.IsWindingUp);
        Assert.AreEqual(new Vector2D(1, 0), state.LungeDirection);

        state.Tick(0.3, Vector2D.Zero, new Vector2D(0, 100));

        Assert.AreEqual(new Vector2D(1, 0), state.LungeDirection);
    }

    [TestMethod]
    public void Tick_AfterWindup_LungesThenReturnsToCooldown()
    {
        var state = new MireHoundBehaviorState();
        state.Tick(MireHoundBehaviorState.InitialCooldownSeconds, Vector2D.Zero, new Vector2D(100, 0));

        state.Tick(MireHoundBehaviorState.WindupSeconds + 0.01, Vector2D.Zero, new Vector2D(0, 100));

        Assert.IsTrue(state.IsLunging);
        Assert.AreEqual(new Vector2D(1, 0), state.LungeDirection);

        state.Tick(MireHoundBehaviorState.LungeSeconds + 0.01, Vector2D.Zero, new Vector2D(0, 100));

        Assert.IsFalse(state.IsWindingUp);
        Assert.IsFalse(state.IsLunging);
        Assert.AreEqual(MireHoundBehaviorState.CooldownSeconds, state.CooldownRemaining, 0.001);
    }
}
