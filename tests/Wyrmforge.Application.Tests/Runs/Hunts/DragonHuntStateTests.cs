using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Hunts;

namespace Wyrmforge.Application.Tests.Runs.Hunts;

[TestClass]
public sealed class DragonHuntStateTests
{
    [TestMethod]
    public void Start_BeginsProtectedEntrance()
    {
        var state = new DragonHuntState();

        state.Start(DragonHuntCatalog.Ashfang);

        Assert.AreEqual(DragonHuntStage.Entrance, state.Stage);
        Assert.IsFalse(state.CanTargetDragon);
        Assert.IsFalse(state.CanDragonAct);
        Assert.AreEqual(0, state.StageProgress, 0.001);
        Assert.AreEqual(DragonHuntEntranceBeat.Omen, state.EntranceBeat);
        Assert.AreEqual(0, state.EntranceBeatProgress, 0.001);
    }

    [TestMethod]
    public void TickStage_EntranceTimeline_ProgressesOmenArrivalRevealBeforeBattle()
    {
        var state = new DragonHuntState();
        var entrance = DragonHuntCatalog.Ashfang.Entrance;
        state.Start(DragonHuntCatalog.Ashfang);

        state.TickStage(entrance.OmenSeconds);
        Assert.AreEqual(DragonHuntEntranceBeat.Arrival, state.EntranceBeat);
        Assert.IsFalse(state.CanTargetDragon);

        state.TickStage(entrance.TravelSeconds);
        Assert.AreEqual(DragonHuntEntranceBeat.Reveal, state.EntranceBeat);
        Assert.IsFalse(state.CanTargetDragon);

        state.TickStage(entrance.RevealSeconds);
        Assert.AreEqual(DragonHuntStage.Battle, state.Stage);
        Assert.AreEqual(DragonHuntEntranceBeat.None, state.EntranceBeat);
        Assert.IsTrue(state.CanTargetDragon);
    }

    [TestMethod]
    public void TickStage_AfterEntranceDuration_BeginsBattle()
    {
        var state = new DragonHuntState();
        state.Start(DragonHuntCatalog.Ashfang);

        var completed = state.TickStage(DragonHuntCatalog.Ashfang.Entrance.DurationSeconds);

        Assert.IsTrue(completed);
        Assert.AreEqual(DragonHuntStage.Battle, state.Stage);
        Assert.IsTrue(state.CanTargetDragon);
        Assert.IsTrue(state.CanDragonAct);
    }

    [TestMethod]
    public void TickSignature_DuringBattle_FiresAfterOpeningDelayAndUsesSignatureCadence()
    {
        var state = new DragonHuntState();
        state.Start(DragonHuntCatalog.Ashfang);
        state.TickStage(DragonHuntCatalog.Ashfang.Entrance.DurationSeconds);

        Assert.IsFalse(state.TickSignature(2.39, 1));
        Assert.IsTrue(state.TickSignature(0.01, 1));
        Assert.IsFalse(state.TickSignature(DragonHuntCatalog.Ashfang.Signature.IntervalSeconds.For(1) - 0.01, 1));
        Assert.IsTrue(state.TickSignature(0.01, 1));
    }

    [TestMethod]
    public void TryStartPhaseBreakForDamage_CrossingHalfHealth_ClosesCombatWindow()
    {
        var state = new DragonHuntState();
        state.Start(DragonHuntCatalog.Rimeclaw);
        state.TickStage(DragonHuntCatalog.Rimeclaw.Entrance.DurationSeconds);

        var started = state.TryStartPhaseBreakForDamage(700, 80, 1350);

        Assert.IsTrue(started);
        Assert.AreEqual(DragonHuntStage.PhaseBreak, state.Stage);
        Assert.IsFalse(state.CanTargetDragon);
    }

    [TestMethod]
    public void TickStage_PhaseBreakCompletes_CannotTriggerSecondBreak()
    {
        var state = new DragonHuntState();
        state.Start(DragonHuntCatalog.Voidweaver);
        state.TickStage(DragonHuntCatalog.Voidweaver.Entrance.DurationSeconds);
        Assert.IsTrue(state.TryStartPhaseBreak(2));

        state.TickStage(DragonHuntCatalog.Voidweaver.PhaseBreakSeconds);

        Assert.AreEqual(DragonHuntStage.Battle, state.Stage);
        Assert.IsFalse(state.TryStartPhaseBreak(2));
        Assert.IsFalse(state.TickSignature(0.60, 2));
        Assert.IsTrue(state.TickSignature(0.06, 2));
    }
}
