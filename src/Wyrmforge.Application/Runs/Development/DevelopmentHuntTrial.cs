using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Development;

public sealed record DevelopmentHuntTrialResult(
    DevelopmentHuntSetup Setup,
    string Build,
    RunAgentPersonality Agent,
    bool Victory,
    bool Defeated,
    bool ReachedSecondPhase,
    double DurationSeconds,
    double HealthRemaining,
    double MinimumHealthRatio,
    double DamageTaken,
    int SignatureWarningFrames,
    int WarningExposureFrames,
    int ActiveStrikeExposureFrames,
    int SignaturePatternsObserved);

public sealed class DevelopmentHuntTrial
{
    public DevelopmentHuntTrialResult Run(SelfPlayBuildDefinition build, DevelopmentHuntSetup setup, RunAgentPersonality personality,
        double maximumSeconds = 90)
    {
        ArgumentNullException.ThrowIfNull(build);
        setup.Validate();
        var factory = new RunSimulationFactory(new SeededRandomSource(1));
        var simulation = factory.CreateDevelopmentHunt(build.SelectedNodes, setup);
        var agent = new HeuristicRunAgent(personality, setup.Seed, build.PreferredSchool);
        var snapshot = simulation.CreateSnapshot();
        var previousHealth = snapshot.Hud.Health;
        var minRatio = 1d;
        var damage = 0d;
        var warnings = 0;
        var warningExposure = 0;
        var activeExposure = 0;
        var patterns = 0;
        var signaturePresent = false;
        var secondPhase = setup.Phase == 2;
        var seconds = 0d;
        const double tick = 0.05;

        while (!simulation.IsEnded && snapshot.Dragon is not null && seconds < maximumSeconds)
        {
            var observation = new RunAgentObservation(snapshot, [], [], [], [], [], simulation.Depth, 0, false);
            snapshot = simulation.Tick(tick, agent.ChooseMovement(observation), setup.Width, setup.Height);
            seconds += tick;
            minRatio = Math.Min(minRatio, snapshot.Hud.Health / Math.Max(1, snapshot.Hud.MaxHealth));
            damage += Math.Max(0, previousHealth - snapshot.Hud.Health);
            previousHealth = snapshot.Hud.Health;
            secondPhase |= snapshot.Dragon?.Phase == 2 || snapshot.Hunt?.Stage == DragonHuntStage.PhaseBreak;

            var signatureHazards = (snapshot.HuntHazards ?? []).Where(hazard => hazard.Signature is not null).ToArray();
            var present = signatureHazards.Length > 0;
            if (present && !signaturePresent) patterns++;
            signaturePresent = present;
            if (!present) continue;

            warnings++;
            var location = new Vector2D(snapshot.Player.X, snapshot.Player.Y);
            foreach (var hazard in signatureHazards)
            {
                if (Vector2D.Distance(location, new Vector2D(hazard.X, hazard.Y)) > hazard.Radius + snapshot.Player.Radius) continue;
                if (hazard.Armed) activeExposure++;
                else warningExposure++;
            }
        }

        var summary = simulation.CreateEvaluationSummary();
        var victory = summary.DragonIds.Contains(setup.Wyrm);
        return new DevelopmentHuntTrialResult(setup, build.Name, personality, victory, simulation.IsEnded && !victory, secondPhase,
            seconds, snapshot.Hud.Health, minRatio, damage, warnings, warningExposure, activeExposure, patterns);
    }
}
