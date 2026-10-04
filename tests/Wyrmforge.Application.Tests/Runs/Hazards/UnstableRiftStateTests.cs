using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Hazards;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Hazards;

[TestClass]
public sealed class UnstableRiftStateTests
{
    [TestMethod]
    public void Tick_WhenEnabled_LocksTelegraphPositionAndDetonatesAfterWarning()
    {
        var state = new UnstableRiftState();
        var lockedPosition = new Vector2D(120, 80);
        var movedPosition = new Vector2D(300, 240);

        Assert.IsFalse(state.Tick(UnstableRiftState.InitialDelaySeconds, true, lockedPosition));
        Assert.IsTrue(state.IsTelegraphing);
        Assert.AreEqual(lockedPosition, state.Position);

        Assert.IsFalse(state.Tick(0.6, true, movedPosition));
        Assert.AreEqual(lockedPosition, state.Position);
        Assert.IsTrue(state.Tick(0.6, true, movedPosition));
        Assert.IsFalse(state.IsTelegraphing);
        Assert.AreEqual(lockedPosition, state.Position);
    }

    [TestMethod]
    public void Tick_WhenDisabled_ResetsBeforeNextActivation()
    {
        var state = new UnstableRiftState();

        Assert.IsFalse(state.Tick(UnstableRiftState.InitialDelaySeconds, true, new Vector2D(40, 50)));
        Assert.IsTrue(state.IsTelegraphing);
        Assert.IsFalse(state.Tick(0.1, false, Vector2D.Zero));
        Assert.IsFalse(state.IsTelegraphing);

        Assert.IsFalse(state.Tick(UnstableRiftState.InitialDelaySeconds - 0.1, true, new Vector2D(70, 90)));
        Assert.IsFalse(state.IsTelegraphing);
        Assert.IsFalse(state.Tick(0.1, true, new Vector2D(70, 90)));
        Assert.IsTrue(state.IsTelegraphing);
    }

    [TestMethod]
    public void Tick_FrequentHazardProfile_ShortensIntervalAfterDetonation()
    {
        var state = new UnstableRiftState();
        var position = new Vector2D(50, 70);

        state.Tick(UnstableRiftState.InitialDelaySeconds, true, position, 0.5);
        Assert.IsTrue(state.Tick(UnstableRiftState.TelegraphSeconds, true, position, 0.5));

        Assert.IsFalse(state.Tick(UnstableRiftState.IntervalSeconds * 0.5 - 0.1, true, position, 0.5));
        Assert.IsFalse(state.IsTelegraphing);
        Assert.IsFalse(state.Tick(0.1, true, position, 0.5));
        Assert.IsTrue(state.IsTelegraphing);
    }

    [TestMethod]
    public void Reset_DuringTelegraph_ClearsEncounterScopedHazardState()
    {
        var state = new UnstableRiftState();
        state.Tick(UnstableRiftState.InitialDelaySeconds, true, new Vector2D(40, 50));

        state.Reset();

        Assert.IsFalse(state.IsTelegraphing);
        Assert.IsFalse(state.Tick(UnstableRiftState.InitialDelaySeconds - 0.1, true, new Vector2D(70, 90)));
        Assert.IsFalse(state.IsTelegraphing);
    }
}
