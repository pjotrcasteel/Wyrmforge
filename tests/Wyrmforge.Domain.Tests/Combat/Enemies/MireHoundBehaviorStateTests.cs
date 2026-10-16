using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Tests.Combat.Enemies;

[TestClass]
public sealed class MireHoundBehaviorStateTests
{
    private static readonly Vector2D Near = new(100, 0);

    [TestMethod]
    public void Tick_OutsidePounceRange_KeepsStalkingAfterCooldown()
    {
        var state = new MireHoundBehaviorState();
        Assert.IsFalse(state.Tick(MireHoundBehaviorState.InitialCooldownSeconds + 1, Vector2D.Zero, new Vector2D(MireHoundBehaviorState.PounceRange + 1, 0)));
        Assert.AreEqual(MireHoundPhase.Stalk, state.Phase);
        Assert.IsTrue(state.Tick(0.01, Vector2D.Zero, Near));
    }

    [TestMethod]
    public void Tick_WhenCommitIsDenied_WaitsInsteadOfWindingUp()
    {
        var state = new MireHoundBehaviorState();
        Assert.IsFalse(state.Tick(MireHoundBehaviorState.InitialCooldownSeconds, Vector2D.Zero, Near, mayCommit: false));
        Assert.AreEqual(MireHoundPhase.Stalk, state.Phase);
        Assert.IsTrue(state.Tick(0.01, Vector2D.Zero, Near));
    }

    [TestMethod]
    public void Tick_WindupLocksTheLaneAndCannotReAim()
    {
        var state = new MireHoundBehaviorState();
        Assert.IsTrue(state.Tick(MireHoundBehaviorState.InitialCooldownSeconds, Vector2D.Zero, Near));
        Assert.AreEqual(MireHoundPhase.Windup, state.Phase);
        Assert.IsTrue(state.IsCommitted);
        state.Tick(0.25, Vector2D.Zero, new Vector2D(0, 100));
        Assert.AreEqual(0.5, state.WindupProgress, 0.001);
        state.Tick(0.26, Vector2D.Zero, new Vector2D(0, 100));
        Assert.AreEqual(MireHoundPhase.Pounce, state.Phase);
        Assert.AreEqual(new Vector2D(1, 0), state.PounceDirection);
        Assert.AreEqual(new Vector2D(MireHoundBehaviorState.PounceDistance, 0), state.PounceEnd);
    }

    [TestMethod]
    public void Tick_AfterPounce_RecoversExposedThenRetreatsThenStalks()
    {
        var state = new MireHoundBehaviorState();
        state.Tick(MireHoundBehaviorState.InitialCooldownSeconds, Vector2D.Zero, Near);
        state.Tick(MireHoundBehaviorState.WindupSeconds + 0.001, Vector2D.Zero, Near);
        state.Tick(MireHoundBehaviorState.PounceSeconds + 0.001, Vector2D.Zero, Near);
        Assert.AreEqual(MireHoundPhase.Recover, state.Phase);
        Assert.IsFalse(state.IsCommitted);
        state.Tick(MireHoundBehaviorState.RecoverSeconds + 0.001, Vector2D.Zero, Near);
        Assert.AreEqual(MireHoundPhase.Retreat, state.Phase);
        state.Tick(MireHoundBehaviorState.RetreatSeconds + 0.001, Vector2D.Zero, Near);
        Assert.AreEqual(MireHoundPhase.Stalk, state.Phase);
        Assert.IsFalse(state.Tick(0.01, Vector2D.Zero, Near), "The pounce cooldown still runs after the hound resets.");
    }

    [TestMethod]
    public void Land_EndsThePounceImmediately()
    {
        var state = new MireHoundBehaviorState();
        state.Tick(MireHoundBehaviorState.InitialCooldownSeconds, Vector2D.Zero, Near);
        state.Land();
        Assert.AreEqual(MireHoundPhase.Windup, state.Phase, "A windup cannot bite.");
        state.Tick(MireHoundBehaviorState.WindupSeconds + 0.001, Vector2D.Zero, Near);
        state.Land();
        Assert.IsTrue(state.PounceLanded);
        Assert.AreEqual(MireHoundPhase.Recover, state.Phase);
    }

    [TestMethod]
    public void StalkPoint_CirclesAtStalkingDistanceOnTheHoundsOwnSide()
    {
        var hunter = new Vector2D(500, 500);
        var position = new Vector2D(800, 500);
        var clockwise = new MireHoundBehaviorState(1).StalkPoint(position, hunter);
        var counter = new MireHoundBehaviorState(-1).StalkPoint(position, hunter);
        Assert.AreEqual(MireHoundBehaviorState.StalkRadius, Vector2D.Distance(clockwise, hunter), 0.001);
        Assert.IsGreaterThan(500d, clockwise.Y);
        Assert.IsLessThan(500d, counter.Y);
    }
}
