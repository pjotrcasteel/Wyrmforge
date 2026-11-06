using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Behaviors;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
namespace Wyrmforge.Domain.Tests.Combat.Dragons;
[TestClass]
public sealed class AshfangBehaviorTests
{
    [TestMethod]
    public void PolicyReactsToRangePathAndHistoryInsteadOfRepeatingATape()
    {
        var brain = new AshfangBehaviorState();
        Assert.AreEqual("claw_right", brain.Decide(100, true, 1));
        Assert.AreEqual("bite", brain.Decide(160, true, 1));
        Assert.AreEqual("breath", brain.Decide(200, true, 1));
        Assert.AreEqual("pounce", brain.Decide(350, true, 1));
        Assert.AreEqual("approach", brain.Decide(100, false, 1));
        brain.Begin("claw_right", Vector2D.Zero, new(100, 0), .8);
        Assert.AreEqual("bite", brain.Decide(100, true, 1));
    }
    [TestMethod]
    public void CommittedWarningCannotRetargetAndRecoveryIsExplicit()
    {
        var brain = new AshfangBehaviorState();brain.Begin("pounce", Vector2D.Zero, new(350, 0), .8);
        var target=brain.Target;brain.Decide(10, true, 2);
        Assert.AreEqual(target, brain.Target);Assert.AreEqual("pounce", brain.Action);
        Assert.IsFalse(brain.Tick(0));Assert.AreEqual(0, brain.Progress, .000001);
        Assert.IsTrue(brain.Tick(.9));brain.Strike();Assert.AreEqual("strike", brain.Phase);
        Assert.IsTrue(brain.Tick(.45));brain.Recover();Assert.AreEqual("recover", brain.Phase);
        Assert.IsTrue(brain.Tick(.8));brain.Finish();Assert.IsFalse(brain.Committed);
        brain.Begin("bite", Vector2D.Zero, new(100, 0), .8);brain.Interrupt();Assert.IsFalse(brain.Committed);
    }
    [TestMethod]
    public void SharedSteeringKeepsChasersDirectAndPackSlotsDistinct()
    {
        Assert.AreEqual(new Vector2D(1, 0), CreatureDecisions.Chase(Vector2D.Zero,new(100,0)));
        var a=CreatureDecisions.SurroundSlot(Vector2D.Zero,92,0);var b=CreatureDecisions.SurroundSlot(Vector2D.Zero,92,Math.PI);
        Assert.AreEqual(92,a.Length,.000001);Assert.AreEqual(92,b.Length,.000001);Assert.IsGreaterThan(180,Vector2D.Distance(a,b));
    }
    [TestMethod]
    public void CloseRangeMemoryOpensBreathVarietyAndResetsForANewEncounter()
    {
        var brain=new AshfangBehaviorState();brain.Begin("claw_right",Vector2D.Zero,new(100,0),.8);brain.Finish();
        brain.Begin("bite",Vector2D.Zero,new(100,0),.8);brain.Finish();
        Assert.AreEqual("breath",brain.Decide(130,true,1),"just outside tail reach, memory of close attacks opens the breath");
        brain.Reset();Assert.AreEqual("claw_right",brain.Decide(100,true,1));
    }
    [TestMethod]
    public void ClingingToItsLegsEarnsTheTailAndTheEnragedWyrmAloneSweepsItsBreath()
    {
        var brain = new AshfangBehaviorState();
        brain.Begin("claw_right", Vector2D.Zero, new(100, 0), .8); brain.Finish();
        brain.Begin("bite", Vector2D.Zero, new(100, 0), .8); brain.Finish();
        Assert.AreEqual("tail_left", brain.Decide(90, true, 1), "after two close commitments the tail comes round");
        brain.Begin("tail_left", Vector2D.Zero, new(100, 0), .8);
        Assert.AreEqual(0, brain.CloseCommitments, "a tail swing resets the cling counter");
        Assert.AreEqual("tail_right", brain.NextTail, "the side alternates");
        Assert.IsGreaterThan(1.2, brain.HalfAngle, "the tail is a wide arc");
        brain.Finish();
        var fresh = new AshfangBehaviorState();
        for (var roll = 0; roll < 40; roll++) Assert.AreNotEqual("breath_sweep", fresh.Decide(200, true, 1), "the sweep is enraged only");
        Assert.IsTrue(fresh.Alternatives(200, true, 2, "", 0).Any(option => option.Action == "breath_sweep" && option.Allowed));
        Assert.IsFalse(fresh.Alternatives(200, true, 1, "", 0).Any(option => option.Action == "breath_sweep" && option.Allowed));
        Assert.IsTrue(fresh.Alternatives(100, true, 2, "", 0).Any(option => option.Action == "claw_combo" && option.Allowed));
    }

    [TestMethod]
    public void TheSweepSwingsItsBeamAcrossAnArcAndAComboHitsTwice()
    {
        var brain = new AshfangBehaviorState();
        brain.Begin("breath_sweep", Vector2D.Zero, new(300, 0), 1.0);
        var start = brain.BeamDirection;
        Assert.IsTrue(brain.Tick(1.2)); brain.Strike();
        var from = brain.BeamDirection;
        brain.Tick(.75);
        var middle = brain.BeamDirection;
        brain.Tick(.75);
        var end = brain.BeamDirection;
        Assert.AreEqual(start.X, from.X, 1e-9); Assert.AreEqual(start.Y, from.Y, 1e-9);
        Assert.AreEqual(1, middle.X, 1e-6, "halfway through the sweep the beam points at where it was aimed");
        Assert.AreEqual(-start.Y, end.Y, 1e-6, "it ends on the far side of the arc");
        Assert.AreNotEqual(Math.Sign(start.Y), Math.Sign(end.Y));
        brain.Finish();
        brain.Begin("breath_sweep", Vector2D.Zero, new(300, 0), 1.0);
        Assert.AreEqual(-Math.Sign(start.Y), Math.Sign(brain.BeamDirection.Y), "the next sweep starts from the other side");

        brain.Begin("claw_combo", Vector2D.Zero, new(100, 0), .8);
        Assert.IsTrue(brain.Tick(.7)); brain.Strike();
        Assert.AreEqual(.6, brain.Duration, 1e-9, "two hits fit in the strike");
    }

    [TestMethod]
    public void StaggerIsAnExposedRecoveryTheHunterCanReadAndItEndsOnItsOwn()
    {
        var brain = new AshfangBehaviorState();
        brain.Begin("pounce", Vector2D.Zero, new(300, 0), .8);
        brain.Interrupt(); brain.Stagger();
        Assert.AreEqual("stagger", brain.Action); Assert.AreEqual("recover", brain.Phase); Assert.IsTrue(brain.Committed);
        Assert.IsTrue(brain.Tick(AshfangBehaviorState.StaggerSeconds + .01));
        brain.Finish(); Assert.IsFalse(brain.Committed);
    }
}
