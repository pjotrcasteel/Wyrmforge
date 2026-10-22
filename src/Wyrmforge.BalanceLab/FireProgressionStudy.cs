using System.Globalization;
using System.Text.Json;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.BalanceLab;

/// <summary>
/// Acceptance diagnostics for permanent Pyromancer progression. Unlike the generic
/// matrix this creates actual core levels, equipped Fireball mutations and Web sockets.
/// It does not change live run generation, unlocks or drop rates.
/// </summary>
internal static class FireProgressionStudy
{
    private sealed record Observation(
        string Cohort,
        int FireballCoreLevel,
        int ArcanePoints,
        string Agent,
        int Seed,
        string Outcome,
        string StopReason,
        double SimulatedSeconds,
        int Kills,
        double KillsPerMinute,
        int Depth,
        int Level,
        int WyrmsReached,
        int EssencesSecured,
        double MinimumHealthRatio,
        double? FirstWyrmSeconds);

    public static async Task RunAsync(BalanceLabOptions options)
    {
        var observations = new List<Observation>();
        var driver = new RunSelfPlayDriver();
        var factory = new RunSimulationFactory(new SeededRandomSource(1));
        var personalities = Enum.GetValues<RunAgentPersonality>();

        foreach (var cohort in FireProgressionCohorts.All)
        {
            foreach (var personality in personalities)
            {
                for (var index = 0; index < options.RunsPerCombination; index++)
                {
                    // Exactly the same seed and agent for all four cohorts.
                    var seed = options.SeedStart + index;
                    var simulation = factory.Create(cohort.Build.SelectedNodes, seed: seed,
                        fireballLevel: cohort.CoreLevel, fireballMutations: cohort.EquippedMutations,
                        amplifierAssignments: cohort.Amplifiers);
                    var agent = new HeuristicRunAgent(personality, seed, SpellSchool.Fire);
                    var run = driver.Play(cohort.Build, seed, simulation, agent,
                        new RunSelfPlayOptions(ArenaWidth: options.ArenaWidth,
                            ArenaHeight: options.ArenaHeight, MaximumSimulatedSeconds: options.MaximumSimulatedSeconds));

                    observations.Add(new Observation(
                        cohort.Name, cohort.CoreLevel, cohort.Build.SpentPoints, personality.ToString(), seed,
                        run.Outcome.ToString(), run.StopReason.ToString(), run.SimulatedSeconds, run.Kills,
                        run.KillsPerMinute, run.Depth, run.Level, run.WyrmsReached,
                        run.EssenceSecured, run.MinimumHealthRatio, run.FirstWyrmSeconds));
                }

                Console.WriteLine($"{cohort.Name} / {personality}: {options.RunsPerCombination} runs");
            }
        }

        Directory.CreateDirectory(options.OutputDirectory);
        var jsonPath = Path.Combine(options.OutputDirectory, "pyromancer-progression-runs.json");
        await File.WriteAllTextAsync(jsonPath, JsonSerializer.Serialize(observations,
            new JsonSerializerOptions { WriteIndented = true }));

        var markdown = new List<string>
        {
            "# Pyromancer v1 — seeded progression comparison",
            "",
            $"Runs per cohort/personality: {options.RunsPerCombination}. Shared seed start: {options.SeedStart}. " +
                $"Max simulated seconds per run: {options.MaximumSimulatedSeconds.ToString(CultureInfo.InvariantCulture)}.",
            "",
            "These are headless combat/route diagnostics, **not** human fun or final difficulty acceptance. " +
                "Core level, learned Fire Web routes, equipped mutations and assigned major amplifiers all enter real RunSimulation.",
            "",
            "| Cohort | Core | Web points | Runs | Median kills/min | Median depth | Wyrms reached | Median minimum health |",
            "|---|---:|---:|---:|---:|---:|---:|---:|",
        };

        foreach (var cohort in FireProgressionCohorts.All)
        {
            var sample = observations.Where(row => row.Cohort == cohort.Name).ToArray();
            markdown.Add($"| {cohort.Name} | {cohort.CoreLevel} | {cohort.Build.SpentPoints} | {sample.Length} | " +
                $"{Median(sample.Select(row => row.KillsPerMinute)):0.0} | " +
                $"{Median(sample.Select(row => (double)row.Depth)):0.0} | " +
                $"{sample.Count(row => row.WyrmsReached > 0)}/{sample.Length} | " +
                $"{Median(sample.Select(row => row.MinimumHealthRatio)):P0} |");
        }

        markdown.Add("");
        markdown.Add("Review the per-run JSON by identical seed and agent, especially the lowest-survival cohorts. " +
            "A higher kills/minute score alone is not proof of balanced pacing: examine duration, depth, deaths and Wyrm contact.");
        markdown.Add("Final Fire acceptance still requires gameplay on a real phone, readable Web navigation, and a human judgement of the power-unlock journey.");
        var reportPath = Path.Combine(options.OutputDirectory, "pyromancer-progression-report.md");
        await File.WriteAllLinesAsync(reportPath, markdown);
        Console.WriteLine($"Fire progression evidence: {reportPath}");
    }

    private static double Median(IEnumerable<double> values)
    {
        var sorted = values.OrderBy(value => value).ToArray();
        if (sorted.Length == 0) return 0;
        return sorted.Length % 2 == 0
            ? (sorted[sorted.Length / 2 - 1] + sorted[sorted.Length / 2]) / 2
            : sorted[sorted.Length / 2];
    }
}
