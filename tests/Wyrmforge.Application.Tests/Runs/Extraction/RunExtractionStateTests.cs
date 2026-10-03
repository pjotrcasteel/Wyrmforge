using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Extraction;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Extraction;

[TestClass]
public sealed class RunExtractionStateTests
{
    [TestMethod]
    public void Start_BeginsFourSecondRitualAtAnchor()
    {
        var state = new RunExtractionState();
        var anchor = new Vector2D(120, 80);

        var started = state.Start(anchor);

        Assert.IsTrue(started);
        Assert.IsTrue(state.IsActive);
        Assert.IsTrue(state.IsProgressing);
        Assert.AreEqual(anchor, state.Position);
        Assert.AreEqual(4d, state.RemainingSeconds);
    }

    [TestMethod]
    public void Tick_WhileInside_AfterFourSecondsCompletesRitual()
    {
        var state = new RunExtractionState();
        var anchor = new Vector2D(120, 80);
        Assert.IsTrue(state.Start(anchor));

        var completedHalfway = state.Tick(2, anchor);
        var completed = state.Tick(2, anchor);

        Assert.IsFalse(completedHalfway);
        Assert.IsTrue(completed);
        Assert.IsFalse(state.IsActive);
        Assert.IsFalse(state.IsProgressing);
        Assert.AreEqual(0d, state.RemainingSeconds);
    }

    [TestMethod]
    public void Tick_OutsideRitual_PausesAndResumesWithoutLosingProgress()
    {
        var state = new RunExtractionState();
        var anchor = new Vector2D(120, 80);
        Assert.IsTrue(state.Start(anchor));
        Assert.IsFalse(state.Tick(1.5, anchor));

        Assert.IsFalse(state.Tick(2, new Vector2D(anchor.X + RunExtractionState.Radius + 1, anchor.Y)));
        Assert.IsFalse(state.IsProgressing);
        Assert.AreEqual(2.5, state.RemainingSeconds, 0.001);

        Assert.IsFalse(state.Tick(1, anchor));
        Assert.IsTrue(state.IsProgressing);
        Assert.AreEqual(1.5, state.RemainingSeconds, 0.001);
    }

    [TestMethod]
    public void Cancel_DuringRitual_ClearsProgress()
    {
        var state = new RunExtractionState();
        var anchor = new Vector2D(120, 80);
        Assert.IsTrue(state.Start(anchor));
        Assert.IsFalse(state.Tick(1, anchor));

        state.Cancel();

        Assert.IsFalse(state.IsActive);
        Assert.IsFalse(state.IsProgressing);
        Assert.AreEqual(Vector2D.Zero, state.Position);
        Assert.AreEqual(0d, state.RemainingSeconds);
    }
}
