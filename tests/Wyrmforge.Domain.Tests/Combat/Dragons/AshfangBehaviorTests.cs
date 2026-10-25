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
        Assert.AreEqual("breath",brain.Decide(100,true,1));
        brain.Reset();Assert.AreEqual("claw_right",brain.Decide(100,true,1));
    }
}
