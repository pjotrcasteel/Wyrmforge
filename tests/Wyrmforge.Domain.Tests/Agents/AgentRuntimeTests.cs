using System.Collections.Immutable;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Agents;

namespace Wyrmforge.Domain.Tests.Agents;

[TestClass]
public sealed class AgentRuntimeTests
{
    private sealed class Policy : IAgentPolicy
    {
        public ImmutableArray<AgentAlternative> Evaluate(AgentContext context) =>
        [new("pursue", "z", 1, true, "equal"), new("pursue", "a", 1, true, "ordinal-tie"),
         new("attack", "forbidden", 999, false, "pressure-budget")];
    }
    private static AgentRuntime Create(int id = 1) => new(new(id, "test", "hostile"), 42, new Policy());

    [TestMethod]
    public void RepeatableTrace_UsesAllowedActionsAndStableTies_AndIsBounded()
    {
        var a = Create(); var b = Create();
        for (var i = 0; i < 500; i++)
        {
            a.Step([new($"fact-{i}", "observed", i, "test")]);
            b.Step([new($"fact-{i}", "observed", i, "test")]);
        }
        Assert.AreEqual(JsonSerializer.Serialize(a.Inspect()), JsonSerializer.Serialize(b.Inspect()));
        Assert.HasCount(AgentRuntime.TraceLimit, a.Inspect().Trace);
        Assert.HasCount(AgentRuntime.FactLimit, a.Inspect().Memory);
        Assert.IsTrue(a.Inspect().Trace.All(t => t.Chosen.Action == "a"));
        Assert.IsFalse(a.Inspect().Memory.Any(f => f.Key == "fact-0"));
    }

    [TestMethod]
    public void PauseDespawnResetAndInterrupt_DoNotLeakRequestsOrAdvanceTime()
    {
        var a = Create();
        var request = a.Step([])!;
        var before = a.Inspect();
        a.Pause();
        Assert.IsNull(a.Step([]));
        Assert.AreEqual(before.Tick, a.Inspect().Tick);
        Assert.IsFalse(a.Report(new(request.Sequence, AgentActionStatus.Completed, "late")));
        a.Resume();
        Assert.IsTrue(a.Report(new(request.Sequence, AgentActionStatus.Interrupted, "stunned")));
        Assert.IsNull(a.Inspect().CurrentAction);
        var replacement = a.Step([])!;
        Assert.AreNotEqual(request.Sequence, replacement.Sequence);
        Assert.IsFalse(a.Report(new(request.Sequence, AgentActionStatus.Completed, "stale")));
        a.Despawn(); a.Resume();
        Assert.IsNull(a.Step([]));
        Assert.IsEmpty(a.Inspect().Memory);
        a.Reset();
        Assert.AreEqual(JsonSerializer.Serialize(Create().Inspect()), JsonSerializer.Serialize(a.Inspect()));
    }

    [TestMethod]
    public void SerializedSnapshot_RestoresNextDecisionAndMemoryWithoutMutableAliases()
    {
        var a = Create();
        for (var i = 0; i < 20; i++) a.Step([new("target", i.ToString(), i, "test")]);
        var held = a.Inspect();
        var b = Create();
        b.Restore(JsonSerializer.Deserialize<AgentSnapshot>(JsonSerializer.Serialize(held))!);
        for (var i = 0; i < 50; i++) { a.Step([]); b.Step([]); }
        Assert.AreEqual("19", held.Memory.Single().Value);
        Assert.AreEqual(20L, held.Tick);
        Assert.AreEqual(JsonSerializer.Serialize(a.Inspect()), JsonSerializer.Serialize(b.Inspect()));
        Assert.ThrowsExactly<ArgumentException>(() => Create(2).Restore(held));
    }

    [TestMethod]
    public void SeededSchedule_StaggersEvaluationsWithoutUsingWorldRandomness()
    {
        var offsets = Enumerable.Range(1, 200).Select(id => AgentSchedule.Offset(42, id, 6)).ToArray();
        Assert.AreEqual(6, offsets.Distinct().Count());
        Assert.IsTrue(offsets.All(x => x >= 0 && x < 6));
        Assert.IsFalse(offsets.SequenceEqual(Enumerable.Range(1, 200).Select(id => AgentSchedule.Offset(43, id, 6))));
        var agent = Create();
        for (var i = 0; i < 60; i++) agent.Step([]);
        Assert.IsTrue(agent.Inspect().Trace.Skip(1).All(t => t.Tick % 6 == AgentSchedule.Offset(42, 1, 6)));
    }

    [TestMethod]
    public void InvalidObservationInputs_AreRejectedBeforeAdvancing()
    {
        var a = Create();
        Assert.ThrowsExactly<ArgumentException>(() => a.Step(default));
        Assert.ThrowsExactly<ArgumentException>(() => a.Step([new("x", "a", 99, "test")]));
        Assert.ThrowsExactly<ArgumentException>(() => a.Step([new("x", "a", 0, "test"), new("x", "b", 0, "test")]));
        Assert.AreEqual(0L, a.Inspect().Tick);
    }
}
