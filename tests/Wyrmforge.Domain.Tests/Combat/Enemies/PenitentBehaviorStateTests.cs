using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Tests.Combat.Enemies;

[TestClass]
public sealed class PenitentBehaviorStateTests
{
    [TestMethod]
    [DataRow(100d, 0d, PenitentBehaviorState.FrontalDamageMultiplier)]
    [DataRow(100d, 40d, PenitentBehaviorState.FrontalDamageMultiplier)]
    [DataRow(0d, 100d, 1d)]
    [DataRow(-100d, 0d, 1d)]
    public void DamageMultiplier_BlocksOnlyTheFront(double sourceX, double sourceY, double expected)
    {
        var penitent = new PenitentBehaviorState(new Vector2D(1, 0));
        Assert.AreEqual(expected, penitent.DamageMultiplier(Vector2D.Zero, new Vector2D(sourceX, sourceY)), 0.0001);
    }

    [TestMethod]
    public void Tick_TurnsTowardTheHunterAtALimitedRate()
    {
        var penitent = new PenitentBehaviorState(new Vector2D(1, 0));
        penitent.Tick(0.5, Vector2D.Zero, new Vector2D(-300, 0), 10);
        var turned = Math.Abs(Math.Atan2(penitent.Facing.Y, penitent.Facing.X));
        Assert.AreEqual(PenitentBehaviorState.TurnRadiansPerSecond * 0.5, turned, 0.001, "A flanking hunter outpaces the shield.");
        Assert.AreEqual(1d, penitent.DamageMultiplier(Vector2D.Zero, new Vector2D(-300, 0)));
    }

    [TestMethod]
    [DataRow(false, true)]
    [DataRow(true, false)]
    public void Bash_LocksItsArcAtWindupAndOnlyHitsInside(bool sidestep, bool expectedHit)
    {
        var penitent = new PenitentBehaviorState(new Vector2D(1, 0));
        var hunter = new Vector2D(40, 0);
        Assert.AreEqual(PenitentEvent.WindupStarted, penitent.Tick(PenitentBehaviorState.InitialCooldownSeconds, Vector2D.Zero, hunter, 10));
        Assert.IsTrue(penitent.IsCommitted);
        if (sidestep) hunter = new Vector2D(-20, 50);
        Assert.AreEqual(PenitentEvent.None, penitent.Tick(0.5, Vector2D.Zero, hunter, 10));
        Assert.AreEqual(new Vector2D(1, 0), penitent.Facing, "The facing is locked during the windup.");
        var result = penitent.Tick(0.2, Vector2D.Zero, hunter, 10);
        Assert.AreEqual(expectedHit ? PenitentEvent.Bashed : PenitentEvent.None, result);
        Assert.AreEqual(PenitentPhase.Recover, penitent.Phase);
        Assert.AreEqual(1d, penitent.DamageMultiplier(Vector2D.Zero, new Vector2D(100, 0)), "After the swing the shield is down.");
    }

    [TestMethod]
    public void TryBreakGuard_OnlyHeavyHitsKnockTheShieldAside()
    {
        var penitent = new PenitentBehaviorState(new Vector2D(1, 0));
        Assert.IsFalse(penitent.TryBreakGuard(10, 100));
        Assert.IsTrue(penitent.ShieldRaised);
        Assert.IsTrue(penitent.TryBreakGuard(40, 100));
        Assert.IsFalse(penitent.ShieldRaised);
    }

    [TestMethod]
    public void GuardPoint_StandsBetweenTheWardAndTheHunter()
    {
        var ward = new Vector2D(0, 0);
        var post = PenitentBehaviorState.GuardPoint(new Vector2D(200, 0), ward);
        Assert.AreEqual(PenitentBehaviorState.WardDistance, post.X, 0.001);
        Assert.AreEqual(new Vector2D(200, 0), PenitentBehaviorState.GuardPoint(new Vector2D(200, 0), null));
    }
}
