namespace Wyrmforge.Application.Runs.Simulation;

public sealed record AgentPerformanceSnapshot(long Frames, int Population, int SightQueries, int PathQueries,
    int MaxSightQueries, int MaxPathQueries, int CommittedThreats, int MaxCommittedThreats,
    double MeanMilliseconds, double P95Milliseconds, double MaximumMilliseconds,
    double LastHunterHealthDamage, double TotalHunterHealthDamage, double MaximumHunterHealthDamagePerStep);

/// <summary>Read-only profiling evidence. Wall time never feeds simulation decisions or replay state.</summary>
internal sealed class AgentPerformanceMetrics
{
    private readonly double[] samples = new double[128];
    private long frames;
    private double windowTotal, maximum, lastHunterHealthDamage, totalHunterHealthDamage, maxHunterHealthDamage;
    private int population, sight, paths, maxSight, maxPaths, pressure, maxPressure;
    public void Record(double milliseconds, int count, int sightQueries, int pathQueries, int committed)
    {
        if (!double.IsFinite(milliseconds) || milliseconds < 0)
            throw new ArgumentOutOfRangeException(nameof(milliseconds));
        if (count < 0 || sightQueries < 0 || pathQueries < 0 || committed < 0)
            throw new ArgumentOutOfRangeException(nameof(count), "Performance counts cannot be negative.");

        // Mean and p95 must describe the same recent window. Lifetime mean masks
        // a late device slowdown while p95 is already based on the last 128 frames.
        var slot = (int)(frames % samples.Length);
        if (frames >= samples.Length) windowTotal -= samples[slot];
        samples[slot] = milliseconds;
        windowTotal += milliseconds;
        frames++;
        maximum = Math.Max(maximum, milliseconds);
        population = count; sight = sightQueries; paths = pathQueries; pressure = committed;
        maxSight = Math.Max(maxSight, sight); maxPaths = Math.Max(maxPaths, paths); maxPressure = Math.Max(maxPressure, committed);
    }
    /// <summary>Called once after the authoritative damage buffer resolves for the whole active Hunt tick.</summary>
    public void RecordResolvedHunterDamage(double healthDamage)
    {
        // Excludes dodges, absorbed hits and guard-time damage. Never enters combat decision logic.
        lastHunterHealthDamage = double.IsFinite(healthDamage) ? Math.Max(0, healthDamage) : 0;
        totalHunterHealthDamage += lastHunterHealthDamage;
        maxHunterHealthDamage = Math.Max(maxHunterHealthDamage, lastHunterHealthDamage);
    }
    public AgentPerformanceSnapshot Inspect()
    {
        var sorted = samples.Take((int)Math.Min(frames, samples.Length)).Order().ToArray();
        var p95 = sorted.Length == 0 ? 0 : sorted[(int)Math.Ceiling(sorted.Length * .95) - 1];
        return new(frames, population, sight, paths, maxSight, maxPaths, pressure, maxPressure, frames == 0 ? 0 : windowTotal / sorted.Length, p95, maximum,
            lastHunterHealthDamage, totalHunterHealthDamage, maxHunterHealthDamage);
    }
}
