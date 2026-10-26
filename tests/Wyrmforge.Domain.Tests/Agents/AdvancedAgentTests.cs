using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Agents;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
namespace Wyrmforge.Domain.Tests.Agents;

[TestClass]
public sealed class AdvancedAgentTests
{
    [TestMethod]
    public void BossPolicy_Adaptation_CannotEnableInvalidPhaseOrRange()
    {
        var boss = new AshfangBehaviorState();
        foreach (var phase in new[] { 0, 3 })
            Assert.IsTrue(boss.Alternatives(100, true, phase, "hold-space", 1).Where(a => a.Action != "approach").All(a => !a.Allowed));
        Assert.IsFalse(boss.Alternatives(800, true, 2, "close-distance", 1).Any(a => a.Action != "approach" && a.Allowed));
        Assert.IsFalse(boss.Alternatives(100, false, 2, "hold-space", 1).Any(a => a.Action != "approach" && a.Allowed));
        foreach (var tier in Enum.GetValues<AgentTier>())
        {
            var profile = CombatCapabilities.For(tier);
            Assert.AreEqual(tier >= AgentTier.Adaptive, profile.Adapt);
            Assert.AreEqual(tier == AgentTier.Masterful, profile.PhaseAware);
        }
    }

    [TestMethod]
    public void Schedule_WholeDay_RepeatsAndIncludesWorkRestAndVisits()
    {
        var activities = Enumerable.Range(0, 180).Select(t => CivilianSchedule.Preferred(t, 42, 1, true)).ToHashSet();
        CollectionAssert.AreEquivalent(new[] { CivilianActivity.Work, CivilianActivity.Socialize, CivilianActivity.Visit, CivilianActivity.Rest }, activities.ToArray());
        for (var t = 0; t < 180; t++)
            Assert.AreEqual(CivilianSchedule.Preferred(t, 42, 1, true), CivilianSchedule.Preferred(t + 180, 42, 1, true));
    }
    [TestMethod]
    public void Pack_LeaseRotation_BoundsPressureAndServesEveryMember()
    {
        var pack = new PackCoordinator();
        var members = Enumerable.Range(1, 20).Select(i => new PackMember(i, true, false)).ToArray();
        var served = new HashSet<int>();
        for (var i = 0; i < 200; i++)
        {
            pack.Tick(.5, members);
            Assert.IsTrue(pack.Inspect().Leases.Length <= 2);
            foreach (var lease in pack.Inspect().Leases) served.Add(lease.Id);
        }
        Assert.AreEqual(20, served.Count);
        var snapshot = pack.Inspect();
        var replay = new PackCoordinator(); replay.Restore(snapshot);
        pack.Tick(.1, members); replay.Tick(.1, members);
        CollectionAssert.AreEqual(pack.Inspect().Leases.ToArray(), replay.Inspect().Leases.ToArray());
    }
    [TestMethod]
    public void Pack_CommittedLane_KeepsSlotUntilRecoveryCompletes()
    {
        var pack = new PackCoordinator();
        pack.Tick(.1, [new(1, true, false), new(2, true, false)]);
        pack.Tick(6, [new(1, false, true), new(2, false, true), new(3, true, false)]);
        Assert.IsTrue(pack.HasSlot(1)); Assert.IsFalse(pack.HasSlot(3));
        pack.Tick(.1, [new(1, false, false), new(2, false, false), new(3, true, false)]);
        Assert.IsTrue(pack.HasSlot(3));
    }
    [TestMethod]
    public void Adaptation_ConfirmedRange_DecaysAndRestoresDeterministically()
    {
        var memory = new EncounterAdaptation();
        for (var i = 0; i < 30; i++) memory.Observe(.5, Vector2D.Zero, new(220, 0));
        Assert.AreEqual("close-distance", memory.Inspect().Counter);
        var replay = new EncounterAdaptation(); replay.Restore(memory.Inspect());
        for (var i = 0; i < 100; i++) { memory.Observe(.5, Vector2D.Zero, null); replay.Observe(.5, Vector2D.Zero, null); }
        Assert.AreEqual(memory.Inspect(), replay.Inspect());
        Assert.AreEqual("none", memory.Inspect().Counter);
        Assert.IsNull(memory.Inspect().Previous);
    }
    [TestMethod]
    public void Tactics_NoVisibleTarget_DoesNotAllowAttack()
    {
        var runtime = new AgentRuntime(new(1, "hound", "hostile"), 42, new CombatTacticPolicy(CombatCapabilities.For(AgentTier.Adaptive), true), 1);
        var result = runtime.Step([new("target", "100,0", 1, "hearing"), new("target-visible", "False", 1, "sensing"),
            new("path-status", "Moving", 1, "navigation"), new("distance", "100", 1, "contact"), new("may-commit", "True", 1, "slot"), new("cooldown", "0", 1, "executor")]);
        Assert.AreEqual("strafe", result!.Action);
        Assert.IsFalse(runtime.Inspect().Trace.Last().Alternatives.Single(a => a.Goal == "attack").Allowed);
    }
}
