using System.Collections.Immutable;

namespace Wyrmforge.Domain.Agents;

public sealed record AgentIdentity(int Id, string Archetype, string Faction);
public enum AgentLifecycle { Active, Paused, Despawned }

/// <summary>Adapter-owned units and provenance; never a reference to mutable world state.</summary>
public sealed record AgentFact(string Key, string Value, long ObservedTick, string Source);
public sealed record AgentActionRequest(long Sequence, string Goal, string Action, string Reason);
public enum AgentActionStatus { Running, Completed, Rejected, Interrupted }
public sealed record AgentActionResult(long Sequence, AgentActionStatus Status, string Reason);
public sealed record AgentAlternative(string Goal, string Action, double Score, bool Allowed, string Reason);
public sealed record AgentContext(AgentIdentity Identity, long Tick, ImmutableArray<AgentFact> Observations,
    ImmutableArray<AgentFact> Memory, AgentActionRequest? CurrentAction, AgentActionResult? LastResult);

public interface IAgentPolicy
{
    ImmutableArray<AgentAlternative> Evaluate(AgentContext context);
}

public sealed record AgentDecision(long Tick, ImmutableArray<AgentAlternative> Alternatives, AgentActionRequest Chosen);

/// <summary>Read-only inspector and core replay state. Executor/world state is owned by its adapter.</summary>
public sealed record AgentSnapshot(AgentIdentity Identity, int Seed, int DecisionIntervalTicks,
    AgentLifecycle Lifecycle, long Tick, long NextDecisionTick, long Sequence,
    ImmutableArray<AgentFact> Observations, ImmutableArray<AgentFact> Memory,
    AgentActionRequest? CurrentAction, AgentActionResult? LastResult, ImmutableArray<AgentDecision> Trace);

/// <summary>Fixed algorithm, independent of process hash codes and the encounter RNG stream.</summary>
public static class AgentSchedule
{
    public static int Offset(int seed, int id, int interval)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(interval, 1);
        var hash = unchecked((uint)seed ^ (uint)id * 0x9e3779b9u);
        hash ^= hash >> 16;
        hash = unchecked(hash * 0x85ebca6bu);
        hash ^= hash >> 13;
        return (int)(hash % (uint)interval);
    }
}
