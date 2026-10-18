using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Tests.Combat.Enemies;

[TestClass]
public sealed class DrownedWraithBehaviorStateTests
{
    private static readonly Vector2D Hunter = Vector2D.Zero;
    private static readonly Vector2D Ring = new(50, 0);

    [TestMethod]
    public void Loop_RipplesThenMaterializesThenStrikesThenSinks()
    {
        var wraith = new DrownedWraithBehaviorState();
        Assert.IsTrue(wraith.IsSubmerged);
        Assert.AreEqual(0d, wraith.Opacity);

        Assert.AreEqual(DrownedWraithEvent.EmergeStarted, RunUntilEvent(wraith, Ring));
        Assert.AreEqual(DrownedWraithPhase.Emerging, wraith.Phase);
        Assert.IsTrue(wraith.IsSubmerged, "The ripple is still untargetable.");
        Assert.IsTrue(wraith.IsCommitted);

        Assert.AreEqual(DrownedWraithEvent.Materialized, RunUntilEvent(wraith, Ring, out var tell));
        Assert.AreEqual(DrownedWraithBehaviorState.EmergeSeconds, tell, 0.06, "The ambush tell lasts the full 0.8s.");
        Assert.AreEqual(-1d, wraith.Facing.X, 0.0001, "The claw locks onto the hunter as it rises.");

        Assert.AreEqual(DrownedWraithEvent.Struck, RunUntilEvent(wraith, Ring, out var windup));
        Assert.AreEqual(DrownedWraithBehaviorState.WindupSeconds, windup, 0.06);
        Assert.AreEqual(DrownedWraithPhase.Exposed, wraith.Phase);
        Assert.IsFalse(wraith.IsCommitted, "The exposed recovery is the punish window, not a threat.");

        Assert.AreEqual(DrownedWraithEvent.Submerged, RunUntilEvent(wraith, Ring, out var open));
        Assert.IsGreaterThanOrEqualTo(DrownedWraithBehaviorState.ExposedSeconds, open);
        Assert.IsTrue(wraith.IsSubmerged);
    }

    [TestMethod]
    public void Emergence_WaitsForTheAmbushRing()
    {
        var wraith = new DrownedWraithBehaviorState();
        for (var time = 0d; time < 2.5; time += 0.05)
            Assert.AreEqual(DrownedWraithEvent.None, wraith.Tick(0.05, new Vector2D(400, 0), Hunter), "Too far to ambush.");
        for (var time = 0d; time < 8; time += 0.05)
            Assert.AreEqual(DrownedWraithEvent.None, wraith.Tick(0.05, new Vector2D(20, 0), Hunter), "Never rises on top of the hunter.");
    }

    [TestMethod]
    public void Emergence_RespectsTheCommittedCapUntilForced()
    {
        var wraith = new DrownedWraithBehaviorState();
        var waited = 0d;
        while (wraith.Tick(0.05, Ring, Hunter, mayCommit: false) == DrownedWraithEvent.None) waited += 0.05;
        Assert.AreEqual(DrownedWraithBehaviorState.ForceEmergeSeconds, waited, 0.1, "It eventually rises anyway so a clear can never stall.");
    }

    [TestMethod]
    public void Emergence_AHunterWhoKeepsOutrunningItStillForcesItUp()
    {
        var wraith = new DrownedWraithBehaviorState();
        var waited = 0d;
        while (wraith.Tick(0.05, new Vector2D(400, 0), Hunter) == DrownedWraithEvent.None) waited += 0.05;
        Assert.AreEqual(DrownedWraithBehaviorState.ForceEmergeSeconds, waited, 0.1, "A kited wraith surfaces where it is and becomes killable.");
    }

    [TestMethod]
    public void Emerging_AbortsWhenTheHunterStandsInTheRipple()
    {
        var wraith = new DrownedWraithBehaviorState();
        RunUntilEvent(wraith, Ring);
        var events = new List<DrownedWraithEvent>();
        for (var time = 0d; time < DrownedWraithBehaviorState.EmergeSeconds + 0.1; time += 0.05)
            events.Add(wraith.Tick(0.05, Ring, Ring + new Vector2D(10, 0)));
        Assert.DoesNotContain(DrownedWraithEvent.Materialized, events);
        Assert.AreEqual(DrownedWraithPhase.Submerged, wraith.Phase);
    }

    [TestMethod]
    [DataRow(-50d, 0d, true)]
    [DataRow(-45d, 25d, true)]
    [DataRow(0d, 50d, false)]
    [DataRow(50d, 0d, false)]
    [DataRow(-75d, 0d, false)]
    public void StrikeHits_OnlyTheLockedFrontalWedge(double x, double y, bool expected)
    {
        var wraith = new DrownedWraithBehaviorState();
        RunUntilEvent(wraith, Ring);
        RunUntilEvent(wraith, Ring);
        Assert.AreEqual(expected, wraith.StrikeHits(Ring, Ring + new Vector2D(x, y), 10));
    }

    [TestMethod]
    public void AmbushPoint_SitsOnTheRingAndAlternatesSides()
    {
        var even = new DrownedWraithBehaviorState(0).AmbushPoint(new Vector2D(300, 0), Hunter);
        var odd = new DrownedWraithBehaviorState(1).AmbushPoint(new Vector2D(300, 0), Hunter);
        Assert.AreEqual(DrownedWraithBehaviorState.AmbushRadius, even.Length, 0.001);
        Assert.AreEqual(DrownedWraithBehaviorState.AmbushRadius, odd.Length, 0.001);
        Assert.IsLessThan(0d, even.Y * odd.Y, "Pairs of wraiths flank from opposite sides.");
    }

    private static DrownedWraithEvent RunUntilEvent(DrownedWraithBehaviorState wraith, Vector2D position) => RunUntilEvent(wraith, position, out _);

    private static DrownedWraithEvent RunUntilEvent(DrownedWraithBehaviorState wraith, Vector2D position, out double elapsed)
    {
        elapsed = 0;
        for (var step = 0; step < 400; step++)
        {
            elapsed += 0.05;
            var happened = wraith.Tick(0.05, position, Hunter);
            if (happened != DrownedWraithEvent.None) return happened;
        }
        Assert.Fail("No event within 20s.");
        return DrownedWraithEvent.None;
    }
}
