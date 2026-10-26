using System.Collections.Immutable;

namespace Wyrmforge.Domain.Agents;

/// <summary>
/// Bounded, renderer-independent decision state. Call once per active simulation step;
/// action execution continues every step even when evaluation is not due. Memory is a
/// bounded last-value blackboard, NOT AI1 sensing or memory expiry.
/// </summary>
public sealed class AgentRuntime
{
    public const int FactLimit = 32;
    public const int AlternativeLimit = 16;
    public const int TraceLimit = 16;
    private readonly IAgentPolicy policy;
    private AgentSnapshot state;

    public AgentRuntime(AgentIdentity identity, int seed, IAgentPolicy policy, int decisionIntervalTicks = 6)
    {
        ArgumentNullException.ThrowIfNull(identity);
        ArgumentNullException.ThrowIfNull(policy);
        ArgumentOutOfRangeException.ThrowIfLessThan(decisionIntervalTicks, 1);
        this.policy = policy;
        state = new(identity, seed, decisionIntervalTicks, AgentLifecycle.Active, 0, 0, 0, [], [], null, null, []);
    }

    public AgentSnapshot Inspect() => state;

    public AgentActionRequest? Step(ImmutableArray<AgentFact> observations)
    {
        if (state.Lifecycle != AgentLifecycle.Active) return null;
        if (observations.IsDefault || observations.Length > FactLimit)
            throw new ArgumentException("Observations must be initialized and bounded.", nameof(observations));
        if (observations.Select(f => f.Key).Distinct(StringComparer.Ordinal).Count() != observations.Length)
            throw new ArgumentException("Observation keys must be unique.", nameof(observations));
        var tick = checked(state.Tick + 1);
        if (observations.Any(f => f.ObservedTick < 0 || f.ObservedTick > tick))
            throw new ArgumentException("Observation ticks cannot be negative or in the future.", nameof(observations));
        // New observations replace a key, with stable age/key eviction. Adapters own sensing/expiry in AI1.
        var memory = observations.Concat(state.Memory.Where(old => !observations.Any(f => f.Key == old.Key)))
            .OrderByDescending(f => f.ObservedTick).ThenBy(f => f.Key, StringComparer.Ordinal)
            .Take(FactLimit).ToImmutableArray();
        state = state with { Tick = tick, Observations = observations, Memory = memory };
        if (tick < state.NextDecisionTick) return state.CurrentAction;
        var alternatives = policy.Evaluate(new(state.Identity, tick, observations, memory, state.CurrentAction, state.LastResult));
        if (alternatives.IsDefault || alternatives.Length > AlternativeLimit || alternatives.Any(a => !double.IsFinite(a.Score)))
            throw new InvalidOperationException("Policy alternatives must be bounded and have finite scores.");
        // Stable ordinal tie break, independent of dictionary order or culture.
        var best = alternatives.Where(a => a.Allowed && a.Score > 0)
            .OrderByDescending(a => a.Score).ThenBy(a => a.Action, StringComparer.Ordinal)
            .ThenBy(a => a.Goal, StringComparer.Ordinal).FirstOrDefault();
        var chosen = new AgentActionRequest(checked(state.Sequence + 1), best?.Goal ?? "idle",
            best?.Action ?? "wait", best?.Reason ?? "no-eligible-action");
        var offset = AgentSchedule.Offset(state.Seed, state.Identity.Id, state.DecisionIntervalTicks);
        var next = tick + 1;
        next += (offset - next % state.DecisionIntervalTicks + state.DecisionIntervalTicks) % state.DecisionIntervalTicks;
        state = state with
        {
            NextDecisionTick = next, Sequence = chosen.Sequence, CurrentAction = chosen,
            Trace = state.Trace.Add(new(tick, alternatives, chosen)).TakeLast(TraceLimit).ToImmutableArray()
        };
        return chosen;
    }

    public bool Report(AgentActionResult result)
    {
        if (state.Lifecycle != AgentLifecycle.Active || result.Sequence != state.CurrentAction?.Sequence) return false;
        state = state with { LastResult = result };
        if (result.Status != AgentActionStatus.Running)
            state = state with { CurrentAction = null, NextDecisionTick = state.Tick + 1 };
        return true;
    }

    public void Pause() { if (state.Lifecycle == AgentLifecycle.Active) state = state with { Lifecycle = AgentLifecycle.Paused }; }
    public void Resume() { if (state.Lifecycle == AgentLifecycle.Paused) state = state with { Lifecycle = AgentLifecycle.Active }; }
    public void Despawn() => state = state with { Lifecycle = AgentLifecycle.Despawned, CurrentAction = null, Observations = [], Memory = [] };
    public void Reset() => state = new(state.Identity, state.Seed, state.DecisionIntervalTicks, AgentLifecycle.Active, 0, 0, 0, [], [], null, null, []);

    public void Restore(AgentSnapshot snapshot)
    {
        ArgumentNullException.ThrowIfNull(snapshot);
        if (snapshot.Identity != state.Identity || snapshot.Seed != state.Seed || snapshot.DecisionIntervalTicks != state.DecisionIntervalTicks
            || snapshot.Tick < 0 || snapshot.NextDecisionTick < 0 || snapshot.Sequence < 0 || !Enum.IsDefined(snapshot.Lifecycle)
            || snapshot.Observations.IsDefault || snapshot.Memory.IsDefault || snapshot.Trace.IsDefault
            || snapshot.Observations.Length > FactLimit || snapshot.Memory.Length > FactLimit || snapshot.Trace.Length > TraceLimit
            || snapshot.Observations.Concat(snapshot.Memory).Any(f => f.ObservedTick < 0 || f.ObservedTick > snapshot.Tick)
            || snapshot.Memory.Select(f => f.Key).Distinct(StringComparer.Ordinal).Count() != snapshot.Memory.Length
            || snapshot.CurrentAction is { } action && action.Sequence != snapshot.Sequence
            || snapshot.LastResult is { } result && (result.Sequence > snapshot.Sequence || !Enum.IsDefined(result.Status))
            || snapshot.Trace.Any(t => t.Tick > snapshot.Tick || t.Tick < 0 || t.Alternatives.IsDefault
                || t.Alternatives.Length > AlternativeLimit || t.Alternatives.Any(a => !double.IsFinite(a.Score))))
            throw new ArgumentException("Snapshot does not match this agent or its bounds.", nameof(snapshot));
        state = snapshot;
    }
}
