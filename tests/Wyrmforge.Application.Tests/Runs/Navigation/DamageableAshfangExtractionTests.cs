using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Onboarding;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

/// <summary>Proves a real-damage Ashfang victory and extraction before any Nexus reward may be spent.</summary>
[TestClass]
public sealed class DamageableAshfangExtractionTests
{
    public TestContext TestContext { get; set; } = null!;

    [TestMethod]
    public void EarnedFireWeb_DamageableVictorySecuresEssenceAndUpgradesNextHunt()
    {
        // A reachable fourth-attempt starting state: the introductory Hunt grants the first
        // point; two more non-abandoned Hunts award one point each, even on defeat.
        // The earlier attempts are not replayed here; #490 separately covers genuine
        // damageable retries and their JSON Web save/reload boundary.
        var progress = new FirstHuntProgress();
        var web = new PassiveTreeSelection(1);
        web.SetActiveSchool(PassiveSchool.Fire);
        for (var completed = 0; completed < 3; completed++)
        {
            var tutorial = progress.TutorialRun;
            Assert.IsTrue(progress.CompleteRun(abandoned: false));
            if (progress.AwardsArcanePoint(tutorial, abandoned: false)) web.GrantPoints(1);
        }

        Assert.AreEqual(3, web.PointBudget);
        Assert.IsTrue(web.SelectPath(["fire-start", "fire-1", "fire-2"]));

        // Preserve earned Web power across a real JSON serialization boundary before combat.
        var savedWeb = JsonSerializer.Serialize(new WebSave(progress.CompletedRuns, web.PointBudget, web.Selected.ToArray()));
        var state = JsonSerializer.Deserialize<WebSave>(savedWeb)!;
        var restored = new PassiveTreeSelection(1);
        restored.SetActiveSchool(PassiveSchool.Fire);
        restored.RestoreBudget(state.Budget);
        restored.RestoreNodes(state.Nodes);
        CollectionAssert.AreEquivalent(web.Selected.ToArray(), restored.Selected.ToArray());

        const int width = 390;
        const int height = 700;
        var evidence = new List<string>();
        RunSimulation? extractedSimulation = null;
        RunSelfPlayMetrics? extractedMetrics = null;
        foreach (var seed in new[] { 42, 1204, 9100, 9101 })
        {
            var simulation = new RunSimulationFactory(new SeededRandomSource(seed)).Create(
                restored.Selected, seed: seed, hunt: HuntSelection.FireTierOne, firstHunt: false);
            var build = new SelfPlayBuildDefinition("Earned Fire Web", SelfPlayBuildCohort.KeystoneRoute,
                SpellSchool.Fire, restored.Selected, [], restored.SpentPoints);
            var agent = new AshfangTelegraphAgent(new HeuristicRunAgent(RunAgentPersonality.Kiter, seed, SpellSchool.Fire));
            var metrics = new RunSelfPlayDriver().Play(build, seed, simulation, agent,
                new RunSelfPlayOptions(ArenaWidth: width, ArenaHeight: height,
                    MaximumSimulatedSeconds: 900, MaximumWallClockSeconds: 60));

            var row = $"seed={seed} outcome={metrics.Outcome} stop={metrics.StopReason} " +
                $"damage={metrics.DamageTaken:F0} healthMin={metrics.MinimumHealthRatio:F2} " +
                $"wyrmReached={metrics.WyrmsReached} dragonsSlain={metrics.DragonsSlain} " +
                $"essence={metrics.EssenceSecured} rituals={metrics.ExtractionRitualsCompleted} " +
                $"seconds={metrics.SimulatedSeconds:F1} evolutions={string.Join(",", metrics.EvolutionIds)}";
            evidence.Add(row);
            TestContext.WriteLine(row);

            if (metrics.Outcome != RunOutcome.Extracted) continue;
            extractedSimulation = simulation;
            extractedMetrics = metrics;
            break;
        }

        var message = string.Join(Environment.NewLine, evidence);
        Assert.IsNotNull(extractedSimulation, "No natural damageable Ashfang extraction observed. This is a gameplay/test-agent blocker, not a reason to enable invulnerability." +
            Environment.NewLine + message);
        Assert.IsNotNull(extractedMetrics);
        Assert.AreEqual(RunSelfPlayStopReason.NaturalEnd, extractedMetrics.StopReason, message);
        Assert.IsGreaterThan(0, extractedMetrics.DamageTaken, "The hunter must have been exposed to actual combat damage.");
        Assert.AreEqual(1, extractedMetrics.DragonsSlain, message);
        Assert.IsGreaterThanOrEqualTo(1, extractedMetrics.EssenceSecured, message);
        Assert.AreEqual(1, extractedMetrics.ExtractionRitualsCompleted, message);

        var summary = extractedSimulation.CreateEvaluationSummary();
        Assert.AreEqual(RunOutcome.Extracted, summary.Outcome);
        Assert.IsGreaterThanOrEqualTo(1, summary.EssenceIds.Count);

        // Only a naturally extracted Essence may enter the vault and purchase the first Nexus upgrade.
        var vault = new DragonEssenceVault();
        foreach (var essence in summary.EssenceIds) vault.Store(essence);
        var beforeSpend = vault.Entries.Count;
        var core = new FireballCoreState();
        Assert.IsTrue(core.DiscoverSecured(summary.EssenceIds));
        Assert.IsTrue(core.Upgrade(vault, new HuntMaterialSatchel()));
        Assert.AreEqual(beforeSpend - 1, vault.Entries.Count, "The Nexus must actually consume one secured Essence.");
        Assert.AreEqual(2, core.Level);
        Assert.IsTrue(core.Equip(0, core.Discovered.Single()));

        var restoredCore = new FireballCoreState();
        restoredCore.Restore(JsonSerializer.Deserialize<FireballCoreSave>(JsonSerializer.Serialize(core.ToSave())));
        Assert.AreEqual(2, restoredCore.Level);
        CollectionAssert.AreEquivalent(core.Equipped.ToArray(), restoredCore.Equipped.ToArray());
        var nextHunt = new RunSimulationFactory(new SeededRandomSource(4321)).Create(
            restored.Selected, seed: 4321, hunt: HuntSelection.FireTierOne,
            fireballLevel: restoredCore.Level, fireballMutations: restoredCore.Equipped);
        var nextSummary = nextHunt.CreateEvaluationSummary();
        Assert.AreEqual(2, nextSummary.PreparedFireballLevel);
        CollectionAssert.AreEquivalent(restoredCore.Equipped.ToArray(), nextSummary.PreparedFireballMutations.ToArray());
    }

    private sealed record WebSave(int Runs, int Budget, string[] Nodes);

    // Only returns legitimate player movement and menu decisions from public snapshots.
    // Does not modify HP, damage, timers, enemies, boss state, RNG, rewards or simulation fields.
    private sealed class AshfangTelegraphAgent(IRunAgent inner) : IRunAgent
    {
        public string Name => "Telegraph-aware " + inner.Name;

        public MovementInput ChooseMovement(RunAgentObservation observation)
        {
            var frame = observation.Snapshot;
            if (frame.Exit is not null || frame.Extraction is not null || frame.Dragon is not { Targetable: true } wyrm)
                return inner.ChooseMovement(observation);

            var player = frame.Player;
            var hazard = (frame.HuntHazards ?? []).OrderBy(h =>
                Math.Hypot(player.X - h.X, player.Y - h.Y) - h.Radius).FirstOrDefault();
            if (hazard is not null && Math.Hypot(player.X - hazard.X, player.Y - hazard.Y) < hazard.Radius + 85)
            {
                var hx = player.X - hazard.X;
                var hy = player.Y - hazard.Y;
                return Math.Hypot(hx, hy) > .001 ? Move(hx, hy) : Move(player.Y - wyrm.Y, wyrm.X - player.X);
            }

            if (wyrm.ActionPhase == "windup")
            {
                var x = player.X - wyrm.AttackTargetX;
                var y = player.Y - wyrm.AttackTargetY;
                if (Math.Hypot(x, y) < 180)
                    return Math.Hypot(x, y) > .001 ? Move(x, y) : Move(wyrm.Y - player.Y, player.X - wyrm.X);
            }

            // Strafe around the Wyrm rather than walking into its melee/cone telegraphs.
            // Only move radially if the real spell range or contact distance requires it.
            var dx = player.X - wyrm.X;
            var dy = player.Y - wyrm.Y;
            var distance = Math.Max(1, Math.Hypot(dx, dy));
            var radial = distance < wyrm.Radius + 110 ? 1.1 : distance > 265 ? -0.6 : 0;
            return Move(-dy / distance + dx / distance * radial, dx / distance + dy / distance * radial);
        }

        private static MovementInput Move(double x, double y)
        {
            var length = Math.Hypot(x, y);
            return length < .0001 ? new MovementInput(0, 0) : new MovementInput(x / length, y / length);
        }

        public string ChooseMapNode(RunAgentObservation observation) => inner.ChooseMapNode(observation);
        public LevelChoice ChooseLevelChoice(RunAgentObservation observation) => inner.ChooseLevelChoice(observation);
        public RelicId ChooseRelic(RunAgentObservation observation) => inner.ChooseRelic(observation);
        public DragonEssenceId ChooseEssence(RunAgentObservation observation) => inner.ChooseEssence(observation);
        public RunCheckpointActionId ChooseCheckpointAction(RunAgentObservation observation)
        {
            if (observation.SecuredEssenceCount > 0 && observation.CheckpointActions.Any(action =>
                    action.Id == RunCheckpointActionId.LeaveRealm && action.Enabled))
                return RunCheckpointActionId.LeaveRealm;
            return inner.ChooseCheckpointAction(observation);
        }
    }
}
