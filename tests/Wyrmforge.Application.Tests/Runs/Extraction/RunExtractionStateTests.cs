using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Extraction;

namespace Wyrmforge.Application.Tests.Runs.Extraction;

[TestClass]
public sealed class RunExtractionStateTests
{
    [TestMethod]
    public void Start_BeginsFourSecondRitual()
    {
        var state = new RunExtractionState();

        var started = state.Start();

        Assert.IsTrue(started);
        Assert.IsTrue(state.IsActive);
        Assert.AreEqual(4d, state.RemainingSeconds);
    }

    [TestMethod]
    public void Tick_AfterFourSeconds_CompletesRitual()
    {
        var state = new RunExtractionState();
        Assert.IsTrue(state.Start());

        var completedHalfway = state.Tick(2);
        var completed = state.Tick(2);

        Assert.IsFalse(completedHalfway);
        Assert.IsTrue(completed);
        Assert.IsFalse(state.IsActive);
        Assert.AreEqual(0d, state.RemainingSeconds);
    }

    [TestMethod]
    public void Cancel_DuringRitual_ClearsProgress()
    {
        var state = new RunExtractionState();
        Assert.IsTrue(state.Start());
        Assert.IsFalse(state.Tick(1));

        state.Cancel();

        Assert.IsFalse(state.IsActive);
        Assert.AreEqual(0d, state.RemainingSeconds);
    }
}
