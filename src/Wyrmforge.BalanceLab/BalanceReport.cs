using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Telemetry;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.BalanceLab;

internal sealed record BalanceReport(
    DateTimeOffset GeneratedAtUtc,
    int RunsPerCombination,
    int TotalRuns,
    IReadOnlyList<BalanceAggregate> Aggregates,
    IReadOnlyList<WyrmAggregate> Wyrms,
    IReadOnlyList<EvolutionAggregate> Evolutions,
    IReadOnlyList<DraftSchoolAggregate> DraftSchools,
    IReadOnlyList<ControlAggregate> Control,
    IReadOnlyList<RunSelfPlayMetrics> Runs);

internal sealed record EvolutionAggregate(
    SpellEvolutionId Evolution,
    int Selections,
    double ExtractionRate,
    double WyrmReachRate,
    double MedianDepth)
{
    public static EvolutionAggregate Create(SpellEvolutionId evolution, IReadOnlyList<RunSelfPlayMetrics> runs)
    {
        if (runs.Count == 0) throw new ArgumentException("Evolution aggregate requires at least one run.", nameof(runs));
        return new EvolutionAggregate(
            evolution,
            runs.Count,
            runs.Count(run => run.Outcome == RunOutcome.Extracted) / (double)runs.Count,
            runs.Count(run => run.WyrmsReached > 0) / (double)runs.Count,
            Percentile(runs.Select(run => (double)run.Depth), 0.5));
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
    double SynergyActivationRate,
    double EvolutionActivationRate,
    double MedianEvolutions)
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
            Rate(runs, run => run.Synergies > 0),
            Rate(runs, run => run.Evolutions > 0),
            Percentile(runs.Select(run => (double)run.Evolutions), 0.5));
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

internal sealed record DraftSchoolAggregate(
    string School,
    DraftRelation Relation,
    int Runs,
    int Rounds,
    double OfferedPerRound,
    double PresentInRounds,
    double PickRate,
    double RerollAwayRate,
    int RerolledIn)
{
    public static IReadOnlyList<DraftSchoolAggregate> Create(IReadOnlyList<RunSelfPlayMetrics> runs)
    {
        var totalRounds = runs.Sum(run => run.Draft.Rounds);
        return runs
            .SelectMany(run => run.Draft.Schools)
            .GroupBy(tally => (tally.School, tally.Relation))
            .OrderBy(group => group.Key.School.HasValue ? (int)group.Key.School.Value : 99).ThenBy(group => group.Key.Relation)
            .Select(group =>
            {
                var offered = group.Sum(tally => tally.Offered);
                return new DraftSchoolAggregate(
                    group.Key.School?.ToString() ?? "Neutral",
                    group.Key.Relation,
                    group.Count(),
                    totalRounds,
                    totalRounds == 0 ? 0 : offered / (double)totalRounds,
                    totalRounds == 0 ? 0 : group.Sum(tally => tally.Rounds) / (double)totalRounds,
                    offered == 0 ? 0 : group.Sum(tally => tally.Selected) / (double)offered,
                    offered == 0 ? 0 : group.Sum(tally => tally.RerolledAway) / (double)offered,
                    group.Sum(tally => tally.RerolledIn));
            })
            .ToArray();
    }
}

/// <summary>Per build: how often its own school is offered and taken, and what crowd control bought (amendment §9).</summary>
internal sealed record ControlAggregate(
    string Build,
    string Agent,
    double PrimaryOfferedPerRound,
    double PrimaryPickRate,
    double EnemyDeniedShare,
    double ThreatDeniedShare,
    double EliteDeniedShare,
    double WyrmDeniedShare,
    double ControlledKillShare,
    double PulseSecondsPerRun,
    double MedianDamageTaken)
{
    public static ControlAggregate Create(string build, string agent, IReadOnlyList<RunSelfPlayMetrics> runs)
    {
        var rounds = runs.Sum(run => run.Draft.Rounds);
        var primary = runs.SelectMany(run => run.Draft.Schools).Where(tally => tally.Relation == DraftRelation.Primary).ToArray();
        var offered = primary.Sum(tally => tally.Offered);
        var control = runs.Select(run => run.Control).ToArray();
        return new ControlAggregate(
            build,
            agent,
            rounds == 0 ? 0 : offered / (double)rounds,
            offered == 0 ? 0 : primary.Sum(tally => tally.Selected) / (double)offered,
            Share(control.Sum(c => c.EnemySecondsDenied), control.Sum(c => c.EnemySecondsPresent)),
            Share(control.Sum(c => c.ThreatSecondsDenied), control.Sum(c => c.ThreatSecondsPresent)),
            Share(control.Sum(c => c.EliteSecondsDenied), control.Sum(c => c.EliteSecondsPresent)),
            Share(control.Sum(c => c.WyrmSecondsDenied), control.Sum(c => c.WyrmSecondsPresent)),
            Share(control.Sum(c => c.KillsWhileControlled), control.Sum(c => c.Kills)),
            control.Length == 0 ? 0 : control.Average(c => c.PulseSecondsDenied),
            Median(runs.Select(run => run.DamageTaken)));
    }

    private static double Share(double part, double whole) => whole <= 0 ? 0 : part / whole;

    private static double Median(IEnumerable<double> values)
    {
        var sorted = values.OrderBy(value => value).ToArray();
        if (sorted.Length == 0) return 0;
        var middle = sorted.Length / 2;
        return sorted.Length % 2 == 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    }
}