using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Progression.Bestiary;

namespace Wyrmforge.Domain.Tests.Combat.Enemies;

[TestClass]
public sealed class BellWardenBehaviorStateTests
{
    private static readonly Vector2D Near = new(100, 0);
    private static readonly Vector2D Far = new(600, 0);

    [TestMethod]
    public void Cycle_SmashesTollsSmashesRallies_WhenTheHunterIsClose()
    {
        var moves = Run(new BellWardenBehaviorState(), 4, Near, canRally: true);
        CollectionAssert.AreEqual(new[] { BellWardenMove.Smash, BellWardenMove.Toll, BellWardenMove.Smash, BellWardenMove.Rally }, moves);
    }

    [TestMethod]
    public void FarHunter_IsTolled_AndAFullRallyCapIsNeverWasted()
    {
        var moves = Run(new BellWardenBehaviorState(), 4, Far, canRally: false);
        CollectionAssert.AreEqual(new[] { BellWardenMove.Toll, BellWardenMove.Toll, BellWardenMove.Toll, BellWardenMove.Toll }, moves);
    }

    [TestMethod]
    public void BellSmash_HasAOneSecondTell_AMarkedCrater_AndALongRecovery()
    {
        Assert.IsGreaterThanOrEqualTo(1.0, BellWardenBehaviorState.SmashWindupSeconds, "Brief §3: 1.0–1.3s tell.");
        Assert.IsLessThanOrEqualTo(1.3, BellWardenBehaviorState.SmashWindupSeconds);
        var state = new BellWardenBehaviorState();
        while (state.Tick(0.05, Vector2D.Zero, 100, 100, Near, true) != BellWardenEvent.WindupStarted) { }
        Assert.AreEqual(BellWardenMove.Smash, state.Move);
        Assert.AreEqual(Near, state.Target, "The crater is fixed on the hunter's spot when the bell is raised.");
        var windup = 0.05;
        BellWardenEvent result;
        while ((result = state.Tick(0.05, Vector2D.Zero, 100, 100, new Vector2D(-300, 0), true)) == BellWardenEvent.None) windup += 0.05;
        Assert.AreEqual(BellWardenEvent.Smashed, result);
        Assert.AreEqual(Near, state.Target, "Moving after the mark appears always escapes it.");
        Assert.IsGreaterThanOrEqualTo(BellWardenBehaviorState.SmashWindupSeconds - 0.06, windup);
        Assert.AreEqual(BellWardenPhase.Recover, state.Phase);
        Assert.AreEqual(0d, state.SpeedMultiplier, "Rooted while it heaves the bell back up.");
        Assert.IsGreaterThanOrEqualTo(1.5, state.PhaseRemaining);
    }

    [TestMethod]
    public void EveryCommitment_IsFollowedByARecoveryWindow()
    {
        var state = new BellWardenBehaviorState();
        var previous = state.Phase;
        var recoveries = 0;
        for (var time = 0d; time < 60; time += 0.05)
        {
            state.Tick(0.05, Vector2D.Zero, 100, 100, time % 20 < 10 ? Near : Far, time % 7 < 3);
            if (previous == BellWardenPhase.Windup && state.Phase != BellWardenPhase.Windup)
            {
                Assert.AreEqual(BellWardenPhase.Recover, state.Phase);
                Assert.IsGreaterThanOrEqualTo(BellWardenBehaviorState.TollRecoverSeconds - 0.06, state.PhaseRemaining);
                recoveries++;
            }
            previous = state.Phase;
        }
        Assert.AreEqual(state.MovesCompleted, recoveries);
        Assert.IsGreaterThan(5, recoveries);
    }

    [TestMethod]
    public void HalfHealth_CancelsTheSwing_StaggersOnce_ThenTollsAFan()
    {
        var state = new BellWardenBehaviorState();
        while (state.Tick(0.05, Vector2D.Zero, 100, 100, Near, true) != BellWardenEvent.WindupStarted) { }
        Assert.AreEqual(BellWardenEvent.CrackStarted, state.Tick(0.05, Vector2D.Zero, 50, 100, Near, true));
        Assert.AreEqual(BellWardenPhase.Crack, state.Phase);
        Assert.IsFalse(state.IsCommitted);
        var events = new List<BellWardenEvent>();
        for (var time = 0d; time < BellWardenBehaviorState.CrackSeconds + 0.1; time += 0.05) events.Add(state.Tick(0.05, Vector2D.Zero, 50, 100, Near, true));
        Assert.DoesNotContain(BellWardenEvent.Smashed, events, "Nothing half-swung lands during the crack.");
        Assert.Contains(BellWardenEvent.CrackCompleted, events);
        Assert.IsTrue(state.Cracked);
        Assert.HasCount(3, state.TollLanes);
        Assert.HasCount(1, new BellWardenBehaviorState().TollLanes);
        Assert.AreEqual(BellWardenEvent.None, state.Tick(0.05, Vector2D.Zero, 10, 100, Near, true), "The crack happens once.");
    }

    [TestMethod]
    public void Bestiary_RevealsTheWarden_OnItsFirstKill()
    {
        var definition = EnemyCatalog.Get(EnemyKind.BellWarden);
        Assert.IsTrue(definition.Unique);
        Assert.IsTrue(BestiaryCatalog.HasEntry(EnemyKind.BellWarden));
        Assert.AreEqual(1, BestiaryState.HunterNoteKillsFor(EnemyKind.BellWarden));
        Assert.IsNull(EliteAffixCatalog.TryFor(EnemyKind.BellWarden));
        Assert.IsGreaterThan(EnemyCatalog.Get(EnemyKind.Reliquary).Radius, definition.Radius, "The largest silhouette on the roster.");
    }

    private static List<BellWardenMove> Run(BellWardenBehaviorState state, int count, Vector2D hunter, bool canRally)
    {
        var moves = new List<BellWardenMove>();
        for (var time = 0d; time < 120 && moves.Count < count; time += 0.05)
        {
            if (state.Tick(0.05, Vector2D.Zero, 100, 100, hunter, canRally) == BellWardenEvent.WindupStarted) moves.Add(state.Move);
        }
        return moves;
    }
}
