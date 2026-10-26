namespace Wyrmforge.Application.Runs.Simulation;

public sealed record AgentPerformanceSnapshot(long Frames, int Population, int SightQueries, int PathQueries,
    int MaxSightQueries, int MaxPathQueries, int CommittedThreats, int MaxCommittedThreats,
    double MeanMilliseconds, double P95Milliseconds, double MaximumMilliseconds);

/// <summary>Read-only profiling evidence. Wall time never feeds simulation decisions or replay state.</summary>
internal sealed class AgentPerformanceMetrics
{
    private readonly double[] samples = new double[128];
    private long frames;
    private double total, maximum;
    private int population, sight, paths, maxSight, maxPaths, pressure, maxPressure;
    public void Record(double milliseconds, int count, int sightQueries, int pathQueries, int committed)
    {
        samples[frames % samples.Length] = milliseconds;
        frames++; total += milliseconds; maximum = Math.Max(maximum, milliseconds);
        population = count; sight = sightQueries; paths = pathQueries; pressure = committed;
        maxSight = Math.Max(maxSight, sight); maxPaths = Math.Max(maxPaths, paths); maxPressure = Math.Max(maxPressure, committed);
    }
    public AgentPerformanceSnapshot Inspect()
    {
        var sorted = samples.Take((int)Math.Min(frames, samples.Length)).Order().ToArray();
        var p95 = sorted.Length == 0 ? 0 : sorted[(int)Math.Ceiling(sorted.Length * .95) - 1];
        return new(frames, population, sight, paths, maxSight, maxPaths, pressure, maxPressure, frames == 0 ? 0 : total / frames, p95, maximum);
    }
}
