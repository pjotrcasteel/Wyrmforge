using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Checkpoint;

namespace Wyrmforge.Application.Tests.Runs.Checkpoint;

[TestClass]
public sealed class RunCheckpointStateTests
{
    [TestMethod]
    public void Enter_OpensFreshRefugeVisit()
    {
        var state = new RunCheckpointState();

        state.Enter();

        Assert.IsTrue(state.IsOpen);
        Assert.AreEqual(1, state.Visit);
        Assert.IsTrue(state.CanUse(RunCheckpointActionId.MendWounds));
    }

    [TestMethod]
    public void TryUse_MendWounds_ConsumesServiceWithoutClosingRefuge()
    {
        var state = new RunCheckpointState();
        state.Enter();

        Assert.IsTrue(state.TryUse(RunCheckpointActionId.MendWounds));

        Assert.IsTrue(state.IsOpen);
        Assert.IsTrue(state.HasUsed(RunCheckpointActionId.MendWounds));
        Assert.IsFalse(state.CanUse(RunCheckpointActionId.MendWounds));
    }

    [TestMethod]
    public void Enter_AfterPreviousVisit_RefreshesPerVisitServices()
    {
        var state = new RunCheckpointState();
        state.Enter();
        state.TryUse(RunCheckpointActionId.MendWounds);
        state.TryUse(RunCheckpointActionId.Descend);

        state.Enter();

        Assert.AreEqual(2, state.Visit);
        Assert.IsTrue(state.IsOpen);
        Assert.IsTrue(state.CanUse(RunCheckpointActionId.MendWounds));
    }

    [TestMethod]
    public void TryUse_DepartureAction_ClosesRefuge()
    {
        var state = new RunCheckpointState();
        state.Enter();

        Assert.IsTrue(state.TryUse(RunCheckpointActionId.LeaveRealm));
        Assert.IsFalse(state.IsOpen);
    }

    [TestMethod]
    public void TryUse_UnknownAction_DoesNotCloseRefuge()
    {
        var state = new RunCheckpointState();
        state.Enter();

        Assert.IsFalse(state.TryUse((RunCheckpointActionId)999));
        Assert.IsTrue(state.IsOpen);
    }
}
