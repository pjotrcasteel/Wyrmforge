using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class BurningGroundStateTests
{
    [TestMethod]
    public void Advance_BeforeTickInterval_DoesNotDealDamageTick()
    {
        var ground = new BurningGroundState(new Vector2D(10, 20), 8);

        var ticks = ground.Advance(BurningGroundState.TickIntervalSeconds - 0.01);

        Assert.AreEqual(0, ticks);
        Assert.IsFalse(ground.IsExpired);
    }

    [TestMethod]
    public void Id_WithExplicitAudioIdentity_IsStableDuringLifetime()
    {
        var ground = new BurningGroundState(new Vector2D(10, 20), 8, id: 42);

        ground.Advance(1);

        Assert.AreEqual(42L, ground.Id);
        Assert.IsGreaterThan(0, ground.RemainingSeconds);
    }

    [TestMethod]
    public void Advance_AtTickInterval_ProducesOneDamageTick()
    {
        var ground = new BurningGroundState(new Vector2D(10, 20), 8);

        var ticks = ground.Advance(BurningGroundState.TickIntervalSeconds);

        Assert.AreEqual(1, ticks);
    }

    [TestMethod]
    public void Advance_ForFullDuration_ProducesEightTicksAndExpires()
    {
        var ground = new BurningGroundState(new Vector2D(10, 20), 8);

        var ticks = ground.Advance(BurningGroundState.DurationSeconds);

        Assert.AreEqual(8, ticks);
        Assert.IsTrue(ground.IsExpired);
    }
}
