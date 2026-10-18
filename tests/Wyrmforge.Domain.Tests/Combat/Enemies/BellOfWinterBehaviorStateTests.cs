using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Tests.Combat.Enemies;

[TestClass]
public sealed class BellOfWinterBehaviorStateTests
{
    private static readonly Vector2D Near = new(100, 0);
    private static readonly Vector2D Far = new(600, 0);

    [TestMethod]
    public void Cycle_SlamsTollsSlamsRecalls_WhenTheHunterIsClose()
    {
        var moves = Run(new BellOfWinterBehaviorState(), 4, Near);
        CollectionAssert.AreEqual(new[] { BellOfWinterMove.Slam, BellOfWinterMove.Toll, BellOfWinterMove.Slam, BellOfWinterMove.Recall }, moves);
    }

    [TestMethod]
    public void FarHunter_IsTolledInsteadOfSlammed_ButStillRecalled()
    {
        var moves = Run(new BellOfWinterBehaviorState(), 4, Far);
        CollectionAssert.AreEqual(new[] { BellOfWinterMove.Toll, BellOfWinterMove.Toll, BellOfWinterMove.Toll, BellOfWinterMove.Recall }, moves);
    }

    [TestMethod]
    public void Slam_TargetsWithinReach_AndRecallMarksTheHuntersSpot()
    {
        var state = new BellOfWinterBehaviorState();
        Assert.IsTrue(TickUntil(state, BellOfWinterEvent.WindupStarted, new Vector2D(200, 0)));
        Assert.AreEqual(BellOfWinterMove.Slam, state.Move);
        Assert.AreEqual(BellOfWinterBehaviorState.SlamMaximumReach, state.Target.X, 1e-9, "The crater lands at arm's length, not on the hunter.");
        Assert.IsTrue(state.IsCommitted);
        Assert.AreEqual(BellOfWinterEvent.WindupStarted, Run(state, 3, Near, stopBefore: BellOfWinterMove.Recall));
        Assert.AreEqual(BellOfWinterMove.Recall, state.Move);
        Assert.AreEqual(Near, state.Target);
    }

    [TestMethod]
    public void TollLanes_TurnEveryRing_AndNeverOpenStraightAtTheHunter()
    {
        var state = new BellOfWinterBehaviorState();
        Assert.IsTrue(TickUntil(state, BellOfWinterEvent.WindupStarted, Near));
        var facing = Math.Atan2(state.Facing.Y, state.Facing.X);
        Assert.IsFalse(BellOfWinterBehaviorState.InGap(facing, state.TollGapAngles(0)), "Standing still in front of the bell is never safe.");
        Assert.HasCount(BellOfWinterBehaviorState.TollGaps, state.TollGapAngles(0));
        for (var ring = 1; ring < BellOfWinterBehaviorState.TollRings; ring++)
            foreach (var gap in state.TollGapAngles(ring - 1))
                Assert.IsFalse(BellOfWinterBehaviorState.InGap(gap, state.TollGapAngles(ring)), "A lane never lines up with the previous ring's.");
    }

    [TestMethod]
    public void HalfHealth_RimesOnce_ThenDeepWinterWidensEveryMove()
    {
        var state = new BellOfWinterBehaviorState();
        Assert.AreEqual(BellOfWinterBehaviorState.TollRings, state.RingCount);
        Assert.AreEqual(BellOfWinterBehaviorState.SlamScars, state.ScarCount);
        Assert.IsTrue(state.TryBeginRime(50, 100));
        Assert.IsFalse(state.TryBeginRime(40, 100));
        Assert.AreEqual(BellOfWinterPhase.Rime, state.Phase);
        Assert.AreEqual(0, state.SpeedMultiplier, "The rime is a free window.");
        var completed = false;
        for (var step = 0; step < 100 && !completed; step++)
            completed = state.Tick(0.05, Vector2D.Zero, 40, 100, Near) == BellOfWinterEvent.RimeCompleted;
        Assert.IsTrue(completed);
        Assert.IsTrue(state.DeepWinter);
        Assert.AreEqual(BellOfWinterBehaviorState.DeepWinterTollRings, state.RingCount);
        Assert.AreEqual(BellOfWinterBehaviorState.DeepWinterSlamScars, state.ScarCount);
        Assert.IsFalse(state.TryBeginRime(10, 100), "Deep Winter never rimes again.");
    }

    [TestMethod]
    public void EveryMove_IsFollowedByARecoveryWithoutMovement()
    {
        var state = new BellOfWinterBehaviorState();
        Assert.IsTrue(TickUntil(state, BellOfWinterEvent.Slammed, Near));
        Assert.AreEqual(BellOfWinterPhase.Recover, state.Phase);
        Assert.AreEqual(BellOfWinterBehaviorState.SlamRecoverSeconds, state.PhaseRemaining, 1e-9);
        Assert.AreEqual(0, state.SpeedMultiplier);
    }

    private static bool TickUntil(BellOfWinterBehaviorState state, BellOfWinterEvent wanted, Vector2D hunter)
    {
        for (var step = 0; step < 400; step++)
            if (state.Tick(0.05, Vector2D.Zero, 100, 100, hunter) == wanted) return true;
        return false;
    }

    private static BellOfWinterMove[] Run(BellOfWinterBehaviorState state, int count, Vector2D hunter)
    {
        var moves = new List<BellOfWinterMove>();
        for (var step = 0; step < 2000 && moves.Count < count; step++)
            if (state.Tick(0.05, Vector2D.Zero, 100, 100, hunter) == BellOfWinterEvent.WindupStarted) moves.Add(state.Move);
        return [.. moves];
    }

    private static BellOfWinterEvent Run(BellOfWinterBehaviorState state, int windups, Vector2D hunter, BellOfWinterMove stopBefore)
    {
        var seen = 0;
        for (var step = 0; step < 2000; step++)
        {
            var result = state.Tick(0.05, Vector2D.Zero, 100, 100, hunter);
            if (result == BellOfWinterEvent.WindupStarted && ++seen == windups && state.Move == stopBefore) return result;
        }
        return BellOfWinterEvent.None;
    }
}
