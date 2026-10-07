using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.BalanceLab;

var options = BalanceLabOptions.Parse(args);
var results = new List<RunSelfPlayMetrics>();
var driver = new RunSelfPlayDriver();
var factory = new RunSimulationFactory(new SeededRandomSource(1));
var personalities = Enum.GetValues<RunAgentPersonality>();

foreach (var build in SelfPlayBuildCatalog.All)
{
    foreach (var personality in personalities)
    {
        for (var index = 0; index < options.RunsPerCombination; index++)
        {
            var seed = options.SeedStart + index;
            var simulation = factory.Create(build.SelectedNodes, seed: seed);
            var agent = new HeuristicRunAgent(personality, seed, build.PreferredSchool);
            var metrics = driver.Play(
                build.Name,
                seed,
                simulation,
                agent,
                new RunSelfPlayOptions(MaximumSimulatedSeconds: options.MaximumSimulatedSeconds));
            results.Add(metrics);
        }

        var completed = results.Count(result => result.Build == build.Name && result.Agent == personality.ToString());
        Console.WriteLine($"{build.Name} / {personality}: {completed} runs");
    }
}

var aggregates = results
    .GroupBy(run => (run.Build, run.Agent))
    .Select(group => BalanceAggregate.Create(group.Key.Build, group.Key.Agent, group.ToArray()))
    .OrderBy(row => row.Build, StringComparer.Ordinal)
    .ThenBy(row => row.Agent, StringComparer.Ordinal)
    .ToArray();

var report = new BalanceReport(DateTimeOffset.UtcNow, options.RunsPerCombination, results.Count, aggregates, results);
await BalanceReportWriter.WriteAsync(report, options.OutputDirectory);

Console.WriteLine($"Balance report written to {Path.GetFullPath(options.OutputDirectory)}");
Console.WriteLine($"Total runs: {results.Count:N0}");
