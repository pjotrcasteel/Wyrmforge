namespace Wyrmforge.Domain.Agents;

public sealed record AgentTraceMetrics(int Id, int RecordedDecisions, int ActionDiversity,
    long? ObservationAgeTicks, long? DecisionLatencyTicks)
{
    /// <summary>Metrics over the bounded retained trace; never claims lifetime totals.</summary>
    public static AgentTraceMetrics From(AgentSnapshot snapshot)
    {
        var target = snapshot.Observations.FirstOrDefault(f => f.Key == "target" && f.Value != "unknown");
        var firstDecision = target is null ? null : snapshot.Trace.FirstOrDefault(d => d.Tick >= target.ObservedTick);
        return new(snapshot.Identity.Id, snapshot.Trace.Length,
            snapshot.Trace.Select(t => t.Chosen.Action).Distinct(StringComparer.Ordinal).Count(),
            target is null ? null : snapshot.Tick - target.ObservedTick,
            firstDecision is null ? null : firstDecision.Tick - target!.ObservedTick);
    }
}
