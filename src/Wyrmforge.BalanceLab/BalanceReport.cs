using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.SelfPlay;

namespace Wyrmforge.BalanceLab;

internal sealed record BalanceReport(
    DateTimeOffset GeneratedAtUtc,
    int RunsPerCombination,
    int TotalRuns,
    IReadOnlyList<BalanceAggregate> Aggregates,
    IReadOnlyList<WyrmAggregate> Wyrms,
    IReadOnlyList<RunSelfPlayMetrics> Runs);

internal sealed record WyrmAggregate(
    string Wyrm,
    int RunsReached,
    double WinRate,
    double ExtractionRate,
    double MedianFirstWyrmSeconds)
{
    public static WyrmAggregate Create(string wyrm, IReadOnlyList<RunSelfPlayMetrics> runs)
    {
        if (runs.Count == 0) throw new ArgumentException("Wyrm aggregate requires at least one run.", nameof(runs));
        return new WyrmAggregate(
            wyrm,
            runs.Count,
            runs.Count(run => run.DragonsSlain > 0) / (double)runs.Count,
            runs.Count(run => run.Outcome == RunOutcome.Extracted) / (double)runs.Count,
            Percentile(runs.Where(run => run.FirstWyrmSeconds.HasValue).Select(run => run.FirstWyrmSeconds!.Value), 0.5));
    }

    private static double Percentile(IEnumerable<double> values, double percentile)
    {
        var sorted = values.OrderBy(value => value).ToArray();
        if (sorted.Length == 0) return 0;
        var position = (sorted.Length - 1) * Math.Clamp(percentile, 0, 1);
        var lower = (int)Math.Floor(position);
        var upper = (int)Math.Ceiling(position);
        if (lower == upper) return sorted[lower];
        var weight = position - lower;
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
}

internal sealed record BalanceAggregate(
    string Build,
    SelfPlayBuildCohort Cohort,
    int SpentArcanePoints,
    string Agent,
    int Runs,
    double ExtractionRate,
    double DefeatRate,
    double TimeLimitRate,
    double DecisionFailureRate,
    double MedianDepth,
    double P90Depth,
    double MedianScore,
    double MedianKillsPerMinute,
    double MedianExperiencePerMinute,
    double MedianExperienceCollectionRate,
    double MedianMinimumHealthRatio,
    double MedianDamageTaken,
    double MedianPeakEnemies,
    double MedianLevel,
    double MedianRunSeconds,
    double MedianEssenceSecured,
    double WyrmReachRate,
    double WyrmVictoryRate,
    double MedianFirstWyrmSeconds,
    double MedianEncounterBreathingRooms,
    double MedianEncounterClimaxes,
    double SynergyActivationRate)
{
    public static BalanceAggregate Create(string build, SelfPlayBuildCohort cohort, int spentArcanePoints, string agent, IReadOnlyList<RunSelfPlayMetrics> runs)
    {
        if (runs.Count == 0) throw new ArgumentException("Aggregate requires at least one run.", nameof(runs));

        return new BalanceAggregate(
            build,
            cohort,
            spentArcanePoints,
            agent,
            runs.Count,
            Rate(runs, run => run.Outcome == RunOutcome.Extracted),
            Rate(runs, run => run.Outcome == RunOutcome.Defeated),
            Rate(runs, run => run.StopReason == RunSelfPlayStopReason.TimeLimit),
            Rate(runs, run => run.StopReason == RunSelfPlayStopReason.DecisionFailure),
            Percentile(runs.Select(run => (double)run.Depth), 0.5),
            Percentile(runs.Select(run => (double)run.Depth), 0.9),
            Percentile(runs.Select(run => (double)run.Score), 0.5),
            Percentile(runs.Select(run => run.KillsPerMinute), 0.5),
            Percentile(runs.Select(run => run.ExperiencePerMinute), 0.5),
            Percentile(runs.Select(run => run.ExperienceCollectionRate), 0.5),
            Percentile(runs.Select(run => run.MinimumHealthRatio), 0.5),
            Percentile(runs.Select(run => run.DamageTaken), 0.5),
            Percentile(runs.Select(run => (double)run.PeakEnemies), 0.5),
            Percentile(runs.Select(run => (double)run.Level), 0.5),
            Percentile(runs.Select(run => run.SimulatedSeconds), 0.5),
            Percentile(runs.Select(run => (double)run.EssenceSecured), 0.5),
            Rate(runs, run => run.WyrmsReached > 0),
            ConditionalRate(runs, run => run.WyrmsReached > 0, run => run.DragonsSlain > 0),
            Percentile(runs.Where(run => run.FirstWyrmSeconds.HasValue).Select(run => run.FirstWyrmSeconds!.Value), 0.5),
            Percentile(runs.Select(run => (double)run.EncounterBreathingRooms), 0.5),
            Percentile(runs.Select(run => (double)run.EncounterClimaxes), 0.5),
            Rate(runs, run => run.Synergies > 0));
    }

    private static double Rate(IEnumerable<RunSelfPlayMetrics> runs, Func<RunSelfPlayMetrics, bool> predicate)
    {
        var values = runs.ToArray();
        return values.Count(predicate) / (double)values.Length;
    }

    private static double ConditionalRate(
        IEnumerable<RunSelfPlayMetrics> runs,
        Func<RunSelfPlayMetrics, bool> condition,
        Func<RunSelfPlayMetrics, bool> predicate)
    {
        var eligible = runs.Where(condition).ToArray();
        return eligible.Length == 0 ? 0 : eligible.Count(predicate) / (double)eligible.Length;
    }

    private static double Percentile(IEnumerable<double> values, double percentile)
    {
        var sorted = values.OrderBy(value => value).ToArray();
        if (sorted.Length == 0) return 0;
        var position = (sorted.Length - 1) * Math.Clamp(percentile, 0, 1);
        var lower = (int)Math.Floor(position);
        var upper = (int)Math.Ceiling(position);
        if (lower == upper) return sorted[lower];
        var weight = position - lower;
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
}
