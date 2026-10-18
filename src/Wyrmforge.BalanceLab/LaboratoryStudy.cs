using System.Globalization;
using System.Text;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.Relics;

namespace Wyrmforge.BalanceLab;

// Measures the two Laboratory tuning questions from the design handover (§17): how often normal play
// reaches each specimen Wyrm without a research lead, and what each mutation's trade-off costs or buys
// against the same builds hunting without it. Every hunt is deterministic per seed.
internal static class LaboratoryStudy
{
    private sealed record Hunt(string Build, string Agent, string Variant, int Seed, RunSelfPlayMetrics Metrics, RunSummary Summary);

    // A player who tracked a specimen takes it when the harvest offers it; everything else is the heuristic agent.
    private sealed class ResearchingAgent(IRunAgent inner, DragonEssenceId specimen) : IRunAgent
    {
        public string Name => inner.Name;
        public MovementInput ChooseMovement(RunAgentObservation observation) => inner.ChooseMovement(observation);
        public string ChooseMapNode(RunAgentObservation observation) => inner.ChooseMapNode(observation);
        public LevelChoice ChooseLevelChoice(RunAgentObservation observation) => inner.ChooseLevelChoice(observation);
        public RelicId ChooseRelic(RunAgentObservation observation) => inner.ChooseRelic(observation);
        public RunCheckpointActionId ChooseCheckpointAction(RunAgentObservation observation) => inner.ChooseCheckpointAction(observation);
        public DragonEssenceId ChooseEssence(RunAgentObservation observation) =>
            observation.EssenceChoices.Any(essence => essence.Id == specimen) ? specimen : inner.ChooseEssence(observation);
    }

    public static async Task RunAsync(BalanceLabOptions options)
    {
        var driver = new RunSelfPlayDriver();
        var factory = new RunSimulationFactory(new SeededRandomSource(1));
        var personalities = Enum.GetValues<RunAgentPersonality>();
        var hunts = new List<Hunt>();

        foreach (var mutation in LaboratoryCatalog.Mutations)
        {
            var school = Domain.Spells.SpellCatalog.Get(mutation.Foundation).School;
            var builds = SelfPlayBuildCatalog.All.Where(build => build.PreferredSchool == school).ToArray();
            foreach (var build in builds)
            foreach (var personality in personalities)
            foreach (var (variant, prepared, lead) in new (string, LaboratoryMutationId?, DragonId?)[]
                     {
                         ("baseline", null, null),
                         (mutation.Name, mutation.Id, null),
                         ($"lead:{mutation.SpecimenWyrm}", null, mutation.SpecimenWyrm),
                     })
            {
                for (var index = 0; index < options.RunsPerCombination; index++)
                {
                    var seed = options.SeedStart + index;
                    var simulation = factory.Create(build.SelectedNodes, seed: seed, preparedMutation: prepared, researchLead: lead);
                    IRunAgent agent = new HeuristicRunAgent(personality, seed, build.PreferredSchool);
                    if (lead is not null) agent = new ResearchingAgent(agent, mutation.Stabilizer);
                    var metrics = driver.Play(build, seed, simulation, agent,
                        new RunSelfPlayOptions(ArenaWidth: options.ArenaWidth, ArenaHeight: options.ArenaHeight, MaximumSimulatedSeconds: options.MaximumSimulatedSeconds));
                    hunts.Add(new(build.Name, personality.ToString(), variant, seed, metrics, simulation.CreateEvaluationSummary()));
                }
                Console.WriteLine($"{build.Name} / {personality} / {variant}: {options.RunsPerCombination} hunts");
            }
        }

        Directory.CreateDirectory(options.OutputDirectory);
        var path = Path.Combine(options.OutputDirectory, "laboratory-study.md");
        await File.WriteAllTextAsync(path, Report(options, hunts));
        Console.WriteLine($"Laboratory study written to {Path.GetFullPath(path)} ({hunts.Count:N0} hunts)");
    }

    private static string Report(BalanceLabOptions options, IReadOnlyList<Hunt> hunts)
    {
        var text = new StringBuilder();
        var culture = CultureInfo.InvariantCulture;
        text.AppendLine("# Laboratory self-play study").AppendLine();
        text.AppendLine(culture, $"{hunts.Count:N0} hunts · {options.RunsPerCombination} seeds per build × agent × variant from seed {options.SeedStart} · max {options.MaximumSimulatedSeconds:0} s · arena {options.ArenaWidth:0}×{options.ArenaHeight:0}").AppendLine();

        text.AppendLine("## Specimen access without a research lead").AppendLine();
        text.AppendLine("Specimen secured uses the unmodified agent, whose heuristic never values vitality; it understates what a player who wants the specimen would secure.").AppendLine().AppendLine("| Wyrm | Slain in hunt | Specimen secured | Hunts |").AppendLine("|---|---:|---:|---:|");
        var baseline = hunts.Where(hunt => hunt.Variant == "baseline").ToArray();
        foreach (var wyrm in Enum.GetValues<DragonId>())
        {
            var slain = baseline.Count(hunt => hunt.Summary.DragonIds.Contains(wyrm));
            var heart = LaboratoryCatalog.Mutations.FirstOrDefault(mutation => mutation.SpecimenWyrm == wyrm);
            var secured = heart is null ? "–" : Percent(baseline.Count(hunt => hunt.Summary.EssenceIds.Contains(heart.Stabilizer)), baseline.Length);
            text.AppendLine(culture, $"| {wyrm} | {Percent(slain, baseline.Length)} | {secured} | {baseline.Length} |");
        }

        text.AppendLine().AppendLine("## Specimen access with a research lead").AppendLine();
        text.AppendLine("The researching agent follows the lead: it takes the specimen whenever the harvest offers it.").AppendLine().AppendLine("| Lead | Lead Wyrm slain | Specimen secured | Hunts |").AppendLine("|---|---:|---:|---:|");
        foreach (var mutation in LaboratoryCatalog.Mutations)
        {
            var led = hunts.Where(hunt => hunt.Variant == $"lead:{mutation.SpecimenWyrm}").ToArray();
            text.AppendLine(culture, $"| {mutation.SpecimenWyrm} | {Percent(led.Count(hunt => hunt.Summary.DragonIds.Contains(mutation.SpecimenWyrm)), led.Length)} | {Percent(led.Count(hunt => hunt.Summary.EssenceIds.Contains(mutation.Stabilizer)), led.Length)} | {led.Length} |");
        }

        text.AppendLine().AppendLine("## Mutation against the same builds without it").AppendLine();
        text.AppendLine("Legacy = baseline hunts in which the agent bound the legacy synergy through a level-up choice.").AppendLine();
        text.AppendLine("| Mutation | Variant | Hunts | Active | Mean score | Mean kills | Mean depth | Death rate | Wyrm slain | Mean reactions |");
        text.AppendLine("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|");
        foreach (var mutation in LaboratoryCatalog.Mutations)
        {
            var school = Domain.Spells.SpellCatalog.Get(mutation.Foundation).School;
            var builds = SelfPlayBuildCatalog.All.Where(build => build.PreferredSchool == school).Select(build => build.Name).ToHashSet();
            var cohort = hunts.Where(hunt => builds.Contains(hunt.Build)).ToArray();
            var rows = new (string Label, Hunt[] Hunts)[]
            {
                ("baseline", cohort.Where(hunt => hunt.Variant == "baseline").ToArray()),
                ("legacy synergy", cohort.Where(hunt => hunt.Variant == "baseline" && hunt.Summary.SynergyIds.Contains(mutation.Realizes)).ToArray()),
                (mutation.Name, cohort.Where(hunt => hunt.Variant == mutation.Name).ToArray()),
                ($"{mutation.Name} (active only)", cohort.Where(hunt => hunt.Variant == mutation.Name && hunt.Summary.PreparedMutation == mutation.Id).ToArray()),
            };
            foreach (var (label, rowHunts) in rows)
            {
                if (rowHunts.Length == 0) { text.AppendLine(culture, $"| {mutation.Name} | {label} | 0 | – | – | – | – | – | – | – |"); continue; }
                text.AppendLine(culture,
                    $"| {mutation.Name} | {label} | {rowHunts.Length} | {Percent(rowHunts.Count(hunt => hunt.Summary.PreparedMutation is not null), rowHunts.Length)} | {rowHunts.Average(hunt => hunt.Summary.Score):N0} | {rowHunts.Average(hunt => hunt.Summary.Kills):N0} | {rowHunts.Average(hunt => hunt.Summary.Depth):0.00} | {Percent(rowHunts.Count(hunt => hunt.Summary.Outcome == RunOutcome.Defeated), rowHunts.Length)} | {Percent(rowHunts.Count(hunt => hunt.Summary.DragonIds.Count > 0), rowHunts.Length)} | {rowHunts.Average(hunt => hunt.Summary.ReactionsTriggered):0.0} |");
            }
        }

        text.AppendLine().AppendLine("## Paired seeds (same build, agent and seed): mutation minus baseline").AppendLine();
        text.AppendLine("| Mutation | Pairs (mutation active) | Score Δ mean | Score Δ median | Mutation scored higher | Kills Δ mean |").AppendLine("|---|---:|---:|---:|---:|---:|");
        foreach (var mutation in LaboratoryCatalog.Mutations)
        {
            var baselineByKey = hunts.Where(hunt => hunt.Variant == "baseline").ToDictionary(hunt => (hunt.Build, hunt.Agent, hunt.Seed));
            var pairs = hunts
                .Where(hunt => hunt.Variant == mutation.Name && hunt.Summary.PreparedMutation == mutation.Id && baselineByKey.ContainsKey((hunt.Build, hunt.Agent, hunt.Seed)))
                .Select(hunt => (Mutated: hunt, Baseline: baselineByKey[(hunt.Build, hunt.Agent, hunt.Seed)]))
                .ToArray();
            if (pairs.Length == 0) continue;
            var deltas = pairs.Select(pair => (double)pair.Mutated.Summary.Score - pair.Baseline.Summary.Score).Order().ToArray();
            text.AppendLine(culture,
                $"| {mutation.Name} | {pairs.Length} | {deltas.Average():+#,0;-#,0;0} | {deltas[deltas.Length / 2]:+#,0;-#,0;0} | {Percent(deltas.Count(delta => delta > 0), deltas.Length)} | {pairs.Average(pair => pair.Mutated.Summary.Kills - pair.Baseline.Summary.Kills):+0.0;-0.0;0} |");
        }
        return text.ToString();
    }

    private static string Percent(int count, int total) => total == 0 ? "–" : (100.0 * count / total).ToString("0.0", CultureInfo.InvariantCulture) + "%";
}
