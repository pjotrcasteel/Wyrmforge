using System.Collections.Immutable;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Agents;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Tests.Agents;

[TestClass]
public sealed class AgentPerceptionTests
{
    private static AgentPerception Create(int interval = 1) => new(new(100, 50, 3, interval), 42, 1);
    private static AgentPerceptionSnapshot Observe(AgentPerception agent, long tick, Vector2D target, bool clear = true,
        ImmutableArray<AgentStimulus> events = default) => agent.Observe(tick, Vector2D.Zero, new(1, 0), target,
            (_, _) => clear, new(1), events.IsDefault ? [] : events);

    [TestMethod]
    public void Restore_SerializedSensor_ContinuesExactlyThroughLossAndExpiry()
    {
        var original = Create();
        Observe(original, 1, new(20, 0));
        var json = System.Text.Json.JsonSerializer.Serialize(original.Inspect());
        var restored = Create();
        restored.Restore(System.Text.Json.JsonSerializer.Deserialize<AgentPerceptionSnapshot>(json)!);
        for (var tick = 2; tick <= 8; tick++)
            Assert.AreEqual(Observe(original, tick, new(30, 0), tick > 5), Observe(restored, tick, new(30, 0), tick > 5));
    }

    [TestMethod]
    public void Observe_OccludedOrOutOfRange_DoesNotAcquireOrSpendUnneededQueries()
    {
        var agent = Create();
        Assert.IsNull(Observe(agent, 1, new(50, 0), false).Contact);
        var calls = 0;
        var budget = new AgentQueryBudget(1);
        var result = agent.Observe(2, Vector2D.Zero, new(1, 0), new(101, 0), (_, _) => { calls++; return true; }, budget, []);
        Assert.IsNull(result.Contact);
        Assert.AreEqual(0, calls);
        Assert.AreEqual(1, budget.Remaining);
    }

    [TestMethod]
    public void Observe_LostTarget_PreservesLastKnownPositionThenExpiresAtBoundary()
    {
        var agent = Create();
        Observe(agent, 1, new(50, 0));
        var hidden = Observe(agent, 2, new(80, 0), false);
        Assert.IsFalse(hidden.Visible);
        Assert.AreEqual(new Vector2D(50, 0), hidden.Contact!.Position);
        Assert.AreEqual(1L, hidden.Contact.ObservedTick);
        Assert.IsNotNull(Observe(agent, 3, new(90, 0), false).Contact);
        Assert.IsNull(Observe(agent, 4, new(90, 0), false).Contact);
    }

    [TestMethod]
    public void Observe_SoundEvent_UsesEmissionPositionWithoutSightOrAttackPermission()
    {
        var agent = Create();
        var sound = new AgentStimulus(1, 1, new(20, 0), 25, AgentStimulusKind.Sound);
        var heard = Observe(agent, 1, new(900, 0), events: [sound]);
        Assert.AreEqual(sound.Position, heard.Contact!.Position);
        Assert.AreEqual("hearing", heard.Contact.Source);
        Assert.IsFalse(heard.Visible);
        Assert.IsNull(Observe(agent, 4, new(900, 0), events: [sound]).Contact, "Replayed sound cannot refresh memory.");
    }

    [TestMethod]
    public void Observe_ThreatOutsideHearingRange_DoesNotRevealPosition()
    {
        var agent = Create();
        Assert.IsNull(Observe(agent, 1, new(900, 0), events: [new(1, 1, new(51, 0), 500, AgentStimulusKind.Threat)]).Contact);
    }

    [TestMethod]
    public void Observe_FacingCone_RejectsBehindAndAllowsAhead()
    {
        var agent = new AgentPerception(new(100, 50, 3, 1, 0.5), 42, 1);
        Assert.IsNull(Observe(agent, 1, new(-50, 0)).Contact);
        Assert.IsTrue(Observe(agent, 2, new(50, 0)).Visible);
    }

    [TestMethod]
    public void Observe_MotionAfterOcclusion_DoesNotInferHiddenHeading()
    {
        var agent = Create();
        Observe(agent, 1, new(10, 0));
        Assert.AreEqual(new Vector2D(1, 0), Observe(agent, 2, new(20, 0)).Contact!.ObservedHeading);
        Observe(agent, 3, new(20, 50), false);
        Assert.AreEqual(Vector2D.Zero, Observe(agent, 4, new(20, 60)).Contact!.ObservedHeading);
    }

    [TestMethod]
    public void Observe_ExhaustedBudget_DoesNotQueryOrRetainVisiblePermission()
    {
        var agent = Create();
        Observe(agent, 1, new(10, 0));
        var result = agent.Observe(2, Vector2D.Zero, Vector2D.Zero, new(20, 0), (_, _) => throw new AssertFailedException(), new(0), []);
        Assert.IsFalse(result.Visible);
        Assert.AreEqual(new Vector2D(10, 0), result.Contact!.Position);
    }

    [TestMethod]
    public void Observe_ManyAgents_IsBoundedAndRepeatable()
    {
        static string Run()
        {
            var agents = Enumerable.Range(0, 200).Select(id => new AgentPerception(new(100, 50, 3, 6), 42, id)).ToArray();
            var trace = new List<AgentPerceptionSnapshot>();
            var detected = new HashSet<int>();
            for (var tick = 1; tick <= 120; tick++)
            {
                var calls = 0;
                var budget = new AgentQueryBudget(16);
                for (var i = 0; i < agents.Length; i++)
                {
                    var index = (i + tick - 1) % agents.Length;
                    var sample = agents[index].Observe(tick, Vector2D.Zero, Vector2D.Zero, new(50, 0), (_, _) => { calls++; return true; }, budget, []);
                    trace.Add(sample);
                    if (sample.Visible) detected.Add(index);
                }
                Assert.IsTrue(calls <= 16);
            }
            Assert.HasCount(200, detected);
            return System.Text.Json.JsonSerializer.Serialize(trace);
        }
        Assert.AreEqual(Run(), Run());
    }
}
