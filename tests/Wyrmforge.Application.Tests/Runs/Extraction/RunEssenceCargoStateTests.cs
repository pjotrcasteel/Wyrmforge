using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Extraction;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Application.Tests.Runs.Extraction;

[TestClass]
public sealed class RunEssenceCargoStateTests
{
    [TestMethod]
    public void SecurePending_MovesCarriedEssenceIntoSecuredCargo()
    {
        var state = new RunEssenceCargoState();
        Assert.IsTrue(state.Carry(DragonEssenceId.AshenWing));

        state.SecurePending();

        Assert.AreEqual(0, state.Pending.Count);
        CollectionAssert.AreEqual(new[] { DragonEssenceId.AshenWing }, state.Secured.ToArray());
    }

    [TestMethod]
    public void LosePending_AfterEarlierCheckpoint_PreservesPreviouslySecuredEssence()
    {
        var state = new RunEssenceCargoState();
        Assert.IsTrue(state.Carry(DragonEssenceId.AshenWing));
        state.SecurePending();
        Assert.IsTrue(state.Carry(DragonEssenceId.TempestWing));

        state.LosePending();

        Assert.AreEqual(0, state.Pending.Count);
        CollectionAssert.AreEqual(new[] { DragonEssenceId.AshenWing }, state.Secured.ToArray());
    }

    [TestMethod]
    public void Carry_DuplicateEssence_IsRejectedAcrossPendingAndSecuredCargo()
    {
        var state = new RunEssenceCargoState();
        Assert.IsTrue(state.Carry(DragonEssenceId.AshenWing));
        Assert.IsFalse(state.Carry(DragonEssenceId.AshenWing));
        state.SecurePending();

        Assert.IsFalse(state.Carry(DragonEssenceId.AshenWing));
    }
}
