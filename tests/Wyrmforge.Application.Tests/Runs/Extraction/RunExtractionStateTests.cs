using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Extraction;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Extraction;

[TestClass]
public sealed class RunExtractionStateTests
{
    [TestMethod]
    public void Start_BeginsTenSecondEvacuationCountdown()
    {
        var state = new RunExtractionState();
        var anchor = new Vector2D(120, 80);

        var started = state.Start(anchor);

        Assert.IsTrue(started);
        Assert.IsTrue(state.IsActive);
        Assert.IsTrue(state.IsProgressing);
        Assert.AreEqual(anchor, state.Position);
        Assert.AreEqual(10d, state.RemainingSeconds);
    }

    [TestMethod]
    public void Tick_AfterTenSeconds_CompletesEvacuation()
    {
        var state = new RunExtractionState();
        var anchor = new Vector2D(120, 80);
        Assert.IsTrue(state.Start(anchor));

        var completedHalfway = state.Tick(5, anchor);
        var completed = state.Tick(5, anchor);

        Assert.IsFalse(completedHalfway);
        Assert.IsTrue(completed);
        Assert.IsFalse(state.IsActive);
        Assert.IsFalse(state.IsProgressing);
        Assert.AreEqual(0d, state.RemainingSeconds);
    }

    [TestMethod]
    public void Tick_AwayFromAnchor_ContinuesEvacuationCountdown()
    {
        var state = new RunExtractionState();
        var anchor = new Vector2D(120, 80);
        Assert.IsTrue(state.Start(anchor));

        Assert.IsFalse(state.Tick(3, new Vector2D(900, 900)));

        Assert.IsTrue(state.IsProgressing);
        Assert.AreEqual(7d, state.RemainingSeconds, 0.001);
    }

    [TestMethod]
    public void Cancel_DuringEvacuation_ClearsProgress()
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
