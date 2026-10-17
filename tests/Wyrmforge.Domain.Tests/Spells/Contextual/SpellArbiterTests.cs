using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells.Contextual;

namespace Wyrmforge.Domain.Tests.Spells.Contextual;

[TestClass]
public sealed class SpellArbiterTests
{
    private static readonly ContextualTriggerPolicy Guard = ContextualTriggerPolicy.Guard;

    [TestMethod]
    [DataRow(3, 3, 0, 0, 0d, false, SpellDecisionReason.BelowThreshold, 3, DisplayName = "Three idle enemies are not a crowd")]
    [DataRow(4, 4, 0, 0, 0d, true, SpellDecisionReason.Cast, 4, DisplayName = "Four in reach is a crowd")]
    [DataRow(3, 3, 1, 0, 0d, true, SpellDecisionReason.Cast, 4, DisplayName = "Three with one touching")]
    [DataRow(1, 1, 0, 1, 0d, true, SpellDecisionReason.Cast, 4, DisplayName = "One defusable windup")]
    [DataRow(5, 5, 2, 0, 3d, false, SpellDecisionReason.Recovering, 7, DisplayName = "Pressure while recovering")]
    [DataRow(2, 0, 2, 0, 0d, false, SpellDecisionReason.NothingToMove, 4, DisplayName = "A boss at the hunter's side cannot be moved")]
    public void Decide_FollowsTheGuardTable(int crowd, int movable, int contacts, int telegraphs, double recovery, bool cast, SpellDecisionReason reason, int score)
    {
        var decision = SpellArbiter.Decide(Guard, new BattlefieldRead(crowd, movable, contacts, telegraphs), recovery);

        Assert.AreEqual(new SpellDecision(cast, score, reason), decision);
    }

    [TestMethod]
    public void Decide_IsAPureFunctionOfItsInputs()
    {
        var read = new BattlefieldRead(4, 3, 1, 1);
        Assert.AreEqual(SpellArbiter.Decide(Guard, read, 0), SpellArbiter.Decide(Guard, read, 0));
    }

    [TestMethod]
    public void Trace_KeepsOnlyTheMostRecentEntries()
    {
        var trace = new SpellDecisionTrace();
        for (var index = 0; index < SpellDecisionTrace.Capacity + 10; index++)
            trace.Record(new(index, ContextualSpellId.WardingPulse, SpellDecisionReason.Cast, 4, default));

        Assert.HasCount(SpellDecisionTrace.Capacity, trace.Entries);
        Assert.AreEqual(10d, trace.Entries[0].Seconds);
        Assert.AreEqual(SpellDecisionTrace.Capacity + 9d, trace.Entries[^1].Seconds);
    }

    [TestMethod]
    public void WardingPulse_HoldsSetPiecesAndHalvesElitePush()
    {
        Assert.IsTrue(WardingPulse.IsImmovable(EnemyKind.BellWarden));
        Assert.IsTrue(WardingPulse.IsImmovable(EnemyKind.Reliquary));
        Assert.IsTrue(WardingPulse.IsImmovable(EnemyKind.ReliquaryWard));
        Assert.IsFalse(WardingPulse.IsImmovable(EnemyKind.Penitent));
        Assert.AreEqual(WardingPulse.PushDistance / 2, WardingPulse.PushFor(elite: true), 1e-9);
    }

    [TestMethod]
    public void MireHound_DisplacedDuringWindup_CarriesItsLaneWithIt()
    {
        var hound = new MireHoundBehaviorState();
        Assert.IsTrue(hound.Tick(10, new Vector2D(100, 0), Vector2D.Zero));
        var end = hound.PounceEnd;

        hound.Displace(new Vector2D(50, 0));

        Assert.AreEqual(end.X + 50, hound.PounceEnd.X, 1e-9);
    }
}
