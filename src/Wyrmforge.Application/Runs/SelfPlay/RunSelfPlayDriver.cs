using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Progression.Experience;

namespace Wyrmforge.Application.Runs.SelfPlay;

public sealed class RunSelfPlayDriver
{
    public RunSelfPlayMetrics Play(SelfPlayBuildDefinition build, int seed, RunSimulation simulation, IRunAgent agent, RunSelfPlayOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(build);
        options ??= new RunSelfPlayOptions();
        var recorder = new MetricsRecorder(build.Name, build.Cohort, build.SpentPoints, agent.Name, seed);
        var snapshot = simulation.CreateSnapshot();
        recorder.Observe(snapshot, 0);

        var simulatedSeconds = 0d;
        var decisionFailures = 0;
        var stopReason = RunSelfPlayStopReason.NaturalEnd;

        while (!simulation.IsEnded && simulatedSeconds < options.MaximumSimulatedSeconds)
        {
            var observation = CreateObservation(simulation, snapshot);

            if (TryResolveDecision(simulation, agent, observation, recorder))
            {
                decisionFailures = 0;
                snapshot = simulation.CreateSnapshot();
                recorder.Observe(snapshot, simulatedSeconds);
                continue;
            }

            if (HasPendingDecision(simulation))
            {
                decisionFailures++;
                if (decisionFailures >= 3)
                {
                    stopReason = RunSelfPlayStopReason.DecisionFailure;
                    break;
                }
                continue;
            }

            snapshot = simulation.Tick(options.TickSeconds, agent.ChooseMovement(observation), options.ArenaWidth, options.ArenaHeight);
            simulatedSeconds += options.TickSeconds;
            recorder.Observe(snapshot, simulatedSeconds);
        }

        if (!simulation.IsEnded)
        {
            if (stopReason == RunSelfPlayStopReason.NaturalEnd) stopReason = RunSelfPlayStopReason.TimeLimit;
            simulation.AbandonRun();
        }
        return recorder.Complete(simulation.CreateEvaluationSummary(), simulation.CreateSnapshot(), simulatedSeconds, stopReason);
    }

    private static RunAgentObservation CreateObservation(RunSimulation simulation, RunRenderSnapshot snapshot) => new(
        snapshot,
        simulation.AvailableMapNodes,
        simulation.PendingChoices,
        simulation.PendingRelicChoices,
        simulation.PendingDragonEssenceChoices,
        simulation.CheckpointActions,
        simulation.Depth,
        simulation.SecuredEssenceCount,
        simulation.CanPushDeeper);

    private static bool TryResolveDecision(RunSimulation simulation, IRunAgent agent, RunAgentObservation observation, MetricsRecorder recorder)
    {
        if (observation.LevelChoices.Count > 0)
        {
            var choice = agent.ChooseLevelChoice(observation);
            if (!simulation.ApplyChoice(choice.Id)) return false;
            recorder.Decision($"draft:{choice.Role}:{choice.Name}");
            return true;
        }

        if (observation.RelicChoices.Count > 0)
        {
            var id = agent.ChooseRelic(observation);
            var choice = observation.RelicChoices.Single(item => item.Id == id);
            if (!simulation.ApplyRelicChoice(id)) return false;
            recorder.Decision($"relic:{choice.Name}");
            return true;
        }

        if (observation.EssenceChoices.Count > 0)
        {
            var id = agent.ChooseEssence(observation);
            var choice = observation.EssenceChoices.Single(item => item.Id == id);
            if (!simulation.ApplyDragonEssence(id)) return false;
            recorder.Decision($"essence:{choice.Name}");
            return true;
        }

        if (simulation.PendingMapChoice)
        {
            var id = agent.ChooseMapNode(observation);
            var choice = observation.AvailableMapNodes.Single(node => node.Id == id);
            if (!simulation.ChooseMapNode(id)) return false;
            recorder.Decision($"route:d{simulation.Depth}:{choice.Name}:{choice.EncounterKind}:{choice.Rarity}");
            return true;
        }

        if (!simulation.AtCheckpoint) return false;

        var action = agent.ChooseCheckpointAction(observation);
        if (!simulation.UseCheckpointAction(action)) return false;
        recorder.Decision($"refuge:{action}:d{simulation.Depth}");
        return true;
    }

    private static bool HasPendingDecision(RunSimulation simulation) =>
        simulation.PendingChoices.Count > 0 ||
        simulation.PendingRelicChoices.Count > 0 ||
        simulation.PendingDragonEssenceChoices.Count > 0 ||
        simulation.PendingMapChoice ||
        simulation.AtCheckpoint;

    private sealed class MetricsRecorder(string build, SelfPlayBuildCohort cohort, int spentArcanePoints, string agent, int seed)
    {
        private readonly Dictionary<int, double> levelUpSeconds = new();
        private readonly List<string> decisions = [];
        private double minimumHealthRatio = 1;
        private double damageTaken;
        private double previousHealth = double.NaN;
        private int peakEnemies;
        private int peakLooseExperience;

        public void Decision(string value) => decisions.Add(value);

        public void Observe(RunRenderSnapshot snapshot, double simulatedSeconds)
        {
            var healthRatio = snapshot.Hud.MaxHealth <= 0 ? 0 : Math.Clamp(snapshot.Hud.Health / snapshot.Hud.MaxHealth, 0, 1);
            minimumHealthRatio = Math.Min(minimumHealthRatio, healthRatio);

            if (!double.IsNaN(previousHealth) && snapshot.Hud.Health < previousHealth) damageTaken += previousHealth - snapshot.Hud.Health;
            previousHealth = snapshot.Hud.Health;

            peakEnemies = Math.Max(peakEnemies, snapshot.Enemies.Count + (snapshot.Dragon is null ? 0 : 1));
            peakLooseExperience = Math.Max(peakLooseExperience, snapshot.ExperienceShards?.Count ?? 0);

            for (var level = 2; level <= snapshot.Hud.Level; level++)
            {
                if (!levelUpSeconds.ContainsKey(level)) levelUpSeconds[level] = simulatedSeconds;
            }
        }

        public RunSelfPlayMetrics Complete(RunSummary summary, RunRenderSnapshot finalSnapshot, double simulatedSeconds, RunSelfPlayStopReason stopReason)
        {
            var totalExperience = finalSnapshot.Hud.Experience;
            for (var level = 1; level < finalSnapshot.Hud.Level; level++) totalExperience += ExperienceCurve.RequiredForLevel(level);

            var uncollectedExperience = finalSnapshot.ExperienceShards?.Sum(shard => shard.Value) ?? 0;
            var experienceAvailable = totalExperience + uncollectedExperience;
            var collectionRate = experienceAvailable == 0 ? 1 : totalExperience / (double)experienceAvailable;
            var minutes = Math.Max(simulatedSeconds / 60, 1d / 60);
            return new RunSelfPlayMetrics(
                build,
                cohort,
                spentArcanePoints,
                agent,
                seed,
                summary.Outcome,
                stopReason,
                summary.Depth,
                summary.Score,
                summary.Kills,
                simulatedSeconds,
                summary.Level,
                totalExperience,
                summary.Kills / minutes,
                totalExperience / minutes,
                uncollectedExperience,
                collectionRate,
                minimumHealthRatio,
                damageTaken,
                peakEnemies,
                peakLooseExperience,
                summary.Choices,
                summary.Synergies,
                summary.DragonsSlain,
                summary.DragonEssences,
                summary.CompletedRouteNodes,
                summary.RareRouteNodes,
                new Dictionary<int, double>(levelUpSeconds),
                decisions.ToArray());
        }
    }
}
