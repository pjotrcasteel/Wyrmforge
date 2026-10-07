using System.Globalization;
using System.Text;
using System.Text.Json;
using Wyrmforge.Application.Runs.SelfPlay;

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
        builder.AppendLine("build,agent,seed,outcome,stopReason,depth,score,kills,seconds,level,totalExperience,killsPerMinute,experiencePerMinute,uncollectedExperience,experienceCollectionRate,minHealthRatio,damageTaken,peakEnemies,peakLooseXp,choices,synergies,dragonsSlain,essenceSecured,completedRoutes,rareRoutes");

        foreach (var run in runs)
        {
            builder.AppendLine(string.Join(',',
                Quote(run.Build),
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
                run.DragonsSlain,
                run.EssenceSecured,
                run.CompletedRouteNodes,
                run.RareRouteNodes));
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
        builder.AppendLine("| Build | Agent | Extract | Defeat | Timeout | Decision fail | Median depth | P90 depth | Kills/min | XP/min | XP collected | Min HP | Peak enemies | Level | Essence | Synergy |");
        builder.AppendLine("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");

        foreach (var row in report.Aggregates)
        {
            builder.AppendLine($"| {row.Build} | {row.Agent} | {row.ExtractionRate:P0} | {row.DefeatRate:P0} | {row.TimeLimitRate:P0} | {row.DecisionFailureRate:P0} | {row.MedianDepth:0.0} | {row.P90Depth:0.0} | {row.MedianKillsPerMinute:0.0} | {row.MedianExperiencePerMinute:0.0} | {row.MedianExperienceCollectionRate:P0} | {row.MedianMinimumHealthRatio:P0} | {row.MedianPeakEnemies:0} | {row.MedianLevel:0.0} | {row.MedianEssenceSecured:0.0} | {row.SynergyActivationRate:P0} |");
        }

        builder.AppendLine();
        builder.AppendLine("## Interpretation guardrails");
        builder.AppendLine();
        builder.AppendLine("- Compare builds within the same agent first; agents intentionally value risk differently.");
        builder.AppendLine("- Treat TimeLimit or DecisionFailure as agent/instrumentation problems before interpreting balance.");
        builder.AppendLine("- Check XP collection rate before blaming a build for low level cadence.");
        builder.AppendLine("- Prefer median and tail behavior over one lucky seed.");
        builder.AppendLine("- A strong build is not automatically unhealthy if it trades survival for tempo or requires a narrower play style.");
        builder.AppendLine("- Balance Lab is measurement equipment, not an automatic nerf/buff oracle.");

        return builder.ToString();
    }

    private static string F(double value) => value.ToString("0.###", CultureInfo.InvariantCulture);
    private static string Quote(string value) => "\"" + value.Replace("\"", "\"\"", StringComparison.Ordinal) + "\"";
}
