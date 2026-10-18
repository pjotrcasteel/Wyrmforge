using System.Globalization;
using System.Text;
using System.Text.Json;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Telemetry;

namespace Wyrmforge.BalanceLab;

internal static class BalanceReportWriter
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static async Task WriteAsync(BalanceReport report, string outputDirectory)
    {
        Directory.CreateDirectory(outputDirectory);
        await File.WriteAllTextAsync(Path.Combine(outputDirectory, "balance-report.json"), JsonSerializer.Serialize(report, JsonOptions));
        await File.WriteAllTextAsync(Path.Combine(outputDirectory, "balance-runs.csv"), Csv(report.Runs));
        await File.WriteAllTextAsync(Path.Combine(outputDirectory, "balance-summary.md"), Markdown(report));
    }

    private static string Csv(IReadOnlyList<RunSelfPlayMetrics> runs)
    {
        var builder = new StringBuilder();
        builder.AppendLine("build,cohort,spentArcanePoints,agent,seed,outcome,stopReason,depth,score,kills,seconds,level,totalExperience,killsPerMinute,experiencePerMinute,uncollectedExperience,experienceCollectionRate,minHealthRatio,damageTaken,peakEnemies,peakLooseXp,choices,synergies,evolutions,evolutionIds,dragonsSlain,wyrmsReached,firstWyrm,firstWyrmSeconds,breathingRooms,climaxes,essenceSecured,completedRoutes,rareRoutes,focusedSurgesCast,extractionRitualsCompleted,deathsDuringExtraction,draftRounds,rerolls,primaryOffered,primarySelected,enemyDeniedShare,threatDeniedShare,eliteDeniedShare,wyrmDeniedShare,controlledKillShare,pulseSecondsDenied,contextualCasts");

        foreach (var run in runs)
        {
            builder.AppendLine(string.Join(',',
                Quote(run.Build),
                run.Cohort,
                run.SpentArcanePoints,
                Quote(run.Agent),
                run.Seed,
                run.Outcome,
                run.StopReason,
                run.Depth,
                run.Score,
                run.Kills,
                F(run.SimulatedSeconds),
                run.Level,
                run.TotalExperience,
                F(run.KillsPerMinute),
                F(run.ExperiencePerMinute),
                run.UncollectedExperience,
                F(run.ExperienceCollectionRate),
                F(run.MinimumHealthRatio),
                F(run.DamageTaken),
                run.PeakEnemies,
                run.PeakLooseExperience,
                run.Choices,
                run.Synergies,
                run.Evolutions,
                Quote(string.Join(';', run.EvolutionIds)),
                run.DragonsSlain,
                run.WyrmsReached,
                Quote(run.FirstWyrm ?? string.Empty),
                run.FirstWyrmSeconds.HasValue ? F(run.FirstWyrmSeconds.Value) : string.Empty,
                run.EncounterBreathingRooms,
                run.EncounterClimaxes,
                run.EssenceSecured,
                run.CompletedRouteNodes,
                run.RareRouteNodes,
                run.FocusedSurgesCast,
                run.ExtractionRitualsCompleted,
                run.DeathsDuringExtraction,
                run.Draft.Rounds,
                run.Draft.Rerolls,
                run.Draft.Schools.Where(tally => tally.Relation == DraftRelation.Primary).Sum(tally => tally.Offered),
                run.Draft.Schools.Where(tally => tally.Relation == DraftRelation.Primary).Sum(tally => tally.Selected),
                F(run.Control.EnemyShare),
                F(run.Control.ThreatShare),
                F(run.Control.EliteShare),
                F(run.Control.WyrmShare),
                F(run.Control.ControlledKillShare),
                F(run.Control.PulseSecondsDenied),
                run.ContextualCasts));
        }

        return builder.ToString();
    }

    private static string Markdown(BalanceReport report)
    {
        var builder = new StringBuilder();
        builder.AppendLine("# Wyrmforge Balance Lab");
        builder.AppendLine();
        builder.AppendLine($"Generated: {report.GeneratedAtUtc:O}");
        builder.AppendLine();
        builder.AppendLine($"Runs: **{report.TotalRuns:N0}** ({report.RunsPerCombination} per build/agent combination)");
        builder.AppendLine();
        builder.AppendLine("| Cohort | Build | Pts | Agent | Extract | Defeat | Wyrm reach | Wyrm win | Evolve | Evo count | First Wyrm | Climaxes | Timeout | Decision fail | Median depth | P90 depth | Kills/min | XP/min | XP collected | Min HP | Peak enemies | Level | Essence | Synergy |");
        builder.AppendLine("| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");

        foreach (var row in report.Aggregates)
        {
            var firstWyrm = row.WyrmReachRate > 0 ? $"{row.MedianFirstWyrmSeconds:0}s" : "—";
            builder.AppendLine($"| {row.Cohort} | {row.Build} | {row.SpentArcanePoints} | {row.Agent} | {row.ExtractionRate:P0} | {row.DefeatRate:P0} | {row.WyrmReachRate:P0} | {row.WyrmVictoryRate:P0} | {row.EvolutionActivationRate:P0} | {row.MedianEvolutions:0.0} | {firstWyrm} | {row.MedianEncounterClimaxes:0.0} | {row.TimeLimitRate:P0} | {row.DecisionFailureRate:P0} | {row.MedianDepth:0.0} | {row.P90Depth:0.0} | {row.MedianKillsPerMinute:0.0} | {row.MedianExperiencePerMinute:0.0} | {row.MedianExperienceCollectionRate:P0} | {row.MedianMinimumHealthRatio:P0} | {row.MedianPeakEnemies:0} | {row.MedianLevel:0.0} | {row.MedianEssenceSecured:0.0} | {row.SynergyActivationRate:P0} |");
        }

        builder.AppendLine();
        builder.AppendLine("## Spell evolution outcomes");
        builder.AppendLine();
        builder.AppendLine("| Evolution | Selections | Extracted | Wyrm reach | Median depth |");
        builder.AppendLine("| --- | ---: | ---: | ---: | ---: |");
        foreach (var evolution in report.Evolutions)
        {
            builder.AppendLine($"| {evolution.Evolution} | {evolution.Selections} | {evolution.ExtractionRate:P0} | {evolution.WyrmReachRate:P0} | {evolution.MedianDepth:0.0} |");
        }

        builder.AppendLine();
        builder.AppendLine("## Wyrm encounter outcomes");
        builder.AppendLine();
        builder.AppendLine("| First Wyrm | Reached | Win after reach | Extracted run | Median arrival |");
        builder.AppendLine("| --- | ---: | ---: | ---: | ---: |");
        foreach (var wyrm in report.Wyrms)
        {
            builder.AppendLine($"| {wyrm.Wyrm} | {wyrm.RunsReached} | {wyrm.WinRate:P0} | {wyrm.ExtractionRate:P0} | {wyrm.MedianFirstWyrmSeconds:0}s |");
        }

        builder.AppendLine();
        builder.AppendLine("## Draft telemetry by school");
        builder.AppendLine();
        builder.AppendLine("Every reward round pooled. Primary = the build's committed school; a synergy counts for each school it fuses.");
        builder.AppendLine();
        builder.AppendLine("| School | Relation | Cards / round | Rounds shown | Pick rate | Rerolled away | Rerolled in |");
        builder.AppendLine("| --- | --- | ---: | ---: | ---: | ---: | ---: |");
        foreach (var school in report.DraftSchools)
        {
            builder.AppendLine($"| {school.School} | {school.Relation} | {school.OfferedPerRound:0.00} | {school.PresentInRounds:P0} | {school.PickRate:P0} | {school.RerollAwayRate:P0} | {school.RerolledIn} |");
        }

        builder.AppendLine();
        builder.AppendLine("## Control utility by build");
        builder.AppendLine();
        builder.AppendLine("Denied = enemy-seconds removed by freeze/chill (frozen counts fully, chill by its slow). Threat = enemies within 160 px of the hunter. The level-up pulse freezes everything for every school, so it is reported apart and excluded from the shares.");
        builder.AppendLine();
        builder.AppendLine("| Build | Agent | Primary / round | Primary pick | Enemy denied | Threat denied | Elite denied | Wyrm denied | Kills while controlled | Pulse s/run | Median damage taken |");
        builder.AppendLine("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
        foreach (var row in report.Control)
        {
            builder.AppendLine($"| {row.Build} | {row.Agent} | {row.PrimaryOfferedPerRound:0.00} | {row.PrimaryPickRate:P0} | {row.EnemyDeniedShare:P1} | {row.ThreatDeniedShare:P1} | {row.EliteDeniedShare:P1} | {row.WyrmDeniedShare:P1} | {row.ControlledKillShare:P0} | {row.PulseSecondsPerRun:0} | {row.MedianDamageTaken:0} |");
        }

        builder.AppendLine();
        builder.AppendLine("## Interpretation guardrails");
        builder.AppendLine();
        builder.AppendLine("- Compare builds only inside the same cohort and agent; cohorts intentionally use different Arcane budgets.");
        builder.AppendLine("- KeystoneRoute builds use one complete Keystone route; FullBuild builds use two-school 20-point plans.");
        builder.AppendLine("- Treat TimeLimit or DecisionFailure as agent/instrumentation problems before interpreting balance.");
        builder.AppendLine("- Use Wyrm reach, conditional Wyrm win rate, first-Wyrm timing and the per-Wyrm table to separate pre-hunt problems from individual hunt problems.");
        builder.AppendLine("- Breathing-room and climax counts verify the Combat Director is actually being experienced.");
        builder.AppendLine("- Check evolution activation before judging branch balance; a branch with only a few selections is not enough evidence.");
        builder.AppendLine("- Compare sister evolution branches for the same spell before interpreting raw extraction differences.");
        builder.AppendLine("- Check XP collection rate before blaming a build for low level cadence.");
        builder.AppendLine("- Prefer median and tail behavior over one lucky seed.");
        builder.AppendLine("- A strong build is not automatically unhealthy if it trades survival for tempo or requires a narrower play style.");
        builder.AppendLine("- Balance Lab is measurement equipment, not an automatic nerf/buff oracle.");

        return builder.ToString();
    }

    private static string F(double value) => value.ToString("0.###", CultureInfo.InvariantCulture);
    private static string Quote(string value) => "\"" + value.Replace("\"", "\"\"", StringComparison.Ordinal) + "\"";
}
