using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Progression.SpellMastery;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

/// <summary>Plays the real Fire Tier-I Hunt, route to Ashfang to extraction, through the public simulation API.</summary>
[TestClass]
public sealed class FireTierOneFullLoopTests
{
    private const int PhoneWidth = 390;
    private const int PhoneHeight = 700;

    [TestMethod]
    [DataRow(42)]
    [DataRow(1204)]
    public void FullHunt_ReachesAshfangDefeatEssenceAndExtraction(int seed)
    {
        var result = PlayFullHunt(seed);

        Assert.AreEqual(RunOutcome.Extracted, result.Metrics.Outcome, $"seed {seed}: stop reason {result.Metrics.StopReason}");
        Assert.IsGreaterThanOrEqualTo(3, result.Metrics.CompletedRouteNodes, "Tier-I teaches three or four fights before the lair.");
        Assert.AreEqual(1, result.Metrics.DragonsSlain);
        Assert.AreEqual(1, result.Metrics.EssenceSecured);
        Assert.AreEqual(1, result.Metrics.ExtractionRitualsCompleted);
        Assert.IsTrue(result.Metrics.Decisions.Any(decision => decision.StartsWith("essence:")));
        Assert.AreEqual(1, result.Metrics.Decisions.Count(decision => decision.StartsWith("route:") && decision.Contains("Ashfang")),
            "The route must end at the Ashfang lair.");
        Assert.IsTrue(result.Simulation.IsEnded);
    }

    [TestMethod]
    public void ExtractedAshfangEssence_UpgradesFireballAndCreditsTheNextEarnedMasteryHunt()
    {
        // Structural two-Hunt proof: the self-play agent prevents deaths, not resource or progression gates.
        // Damageable player and mobile touch acceptance remain independent gameplay requirements.
        var first = PlayFullHunt(42);
        var firstSummary = first.Simulation.CreateEvaluationSummary();
        Assert.AreEqual(RunOutcome.Extracted, firstSummary.Outcome);
        Assert.IsGreaterThanOrEqualTo(1, firstSummary.EssenceIds.Count);

        var vault = new DragonEssenceVault();
        foreach (var essence in firstSummary.EssenceIds)
        {
            vault.Store(essence);
        }

        var core = new FireballCoreState();
        Assert.IsTrue(core.DiscoverSecured(firstSummary.EssenceIds));
        Assert.IsTrue(core.Upgrade(vault, new HuntMaterialSatchel()));
        Assert.AreEqual(2, core.Level);
        Assert.AreEqual(1, core.SocketCapacity);
        Assert.IsTrue(core.Equip(0, core.Discovered.Single()));

        var second = PlayFullHunt(1204, core.Level, core.Equipped);
        var summary = second.Simulation.CreateEvaluationSummary();
        Assert.AreEqual(RunOutcome.Extracted, summary.Outcome);
        Assert.AreEqual(SpellId.FireBolt, summary.ActiveSpell);
        Assert.AreEqual(2, summary.PreparedFireballLevel);
        CollectionAssert.AreEquivalent(core.Equipped.ToArray(), summary.PreparedFireballMutations.ToArray());

        var mastery = new SpellMasteryState();
        var evidence = new MasteryRunEvidence(summary.CompletedRouteNodes, summary.Depth,
            summary.Outcome == RunOutcome.Abandoned, summary.WyrmMasteryFeats.ToHashSet(),
            summary.SpellLoadout.Select(spell => new MasteryRunSpell(spell.Id, spell.Rank)).ToArray())
        {
            ActiveSpell = summary.ActiveSpell,
            Extracted = summary.Outcome == RunOutcome.Extracted,
            FireballLevel = summary.PreparedFireballLevel,
            FireballMutations = summary.PreparedFireballMutations,
        };

        var rewarded = mastery.RecordRun(evidence);
        CollectionAssert.Contains(rewarded.Progressed.ToArray(), SpellId.FireBolt);
        Assert.AreEqual(1, mastery.Get(SpellId.FireBolt).MeaningfulRuns);
        Assert.IsFalse(mastery.Unlocks(Wyrmforge.Domain.Spells.Evolutions.SpellEvolutionId.Wyrmfire),
            "One meaningful Hunt must not bypass the four-extraction mastery requirement.");
        Assert.AreEqual(0, mastery.RecordRun(evidence with { Extracted = false }).Progressed.Count,
            "An unextracted Fireball run cannot be credited as a meaningful hunt.");
    }

    [TestMethod]
    public void FullHunt_IsDeterministicForTheSameSeed()
    {
        var first = PlayFullHunt(42).Metrics;
        var second = PlayFullHunt(42).Metrics;

        Assert.AreEqual(first.Outcome, second.Outcome);
        Assert.AreEqual(first.Score, second.Score);
        Assert.AreEqual(first.Kills, second.Kills);
        Assert.AreEqual(first.SimulatedSeconds, second.SimulatedSeconds);
        CollectionAssert.AreEqual(first.Decisions.ToArray(), second.Decisions.ToArray());
    }

    private static (RunSelfPlayMetrics Metrics, RunSimulation Simulation) PlayFullHunt(int seed,
        int fireballLevel = 1, IReadOnlyCollection<FireballMutationId>? fireballMutations = null)
    {
        var simulation = new RunSimulationFactory(new SeededRandomSource(seed))
            .Create(new HashSet<string>(), seed: seed, hunt: HuntSelection.FireTierOne,
                fireballLevel: fireballLevel, fireballMutations: fireballMutations);
        var build = SelfPlayBuildCatalog.Get("Fire • Inferno");
        var agent = new InvulnerableAgent(new HeuristicRunAgent(RunAgentPersonality.BuildFocused, seed, build.PreferredSchool), simulation);
        var metrics = new RunSelfPlayDriver().Play(build, seed, simulation, agent,
            new RunSelfPlayOptions(ArenaWidth: PhoneWidth, ArenaHeight: PhoneHeight, MaximumSimulatedSeconds: 3600));
        return (metrics, simulation);
    }

    // Combat skill is not under test; the loop is. Health is restored so a balance-dependent death cannot hide a loop regression.
    // Spells pause during the walk to the exit, so a pinned agent sidesteps the blocking prop as a player would.
    private sealed class InvulnerableAgent(IRunAgent inner, RunSimulation simulation) : IRunAgent
    {
        private static readonly FieldInfo PlayerField = typeof(RunSimulation).GetField("player", BindingFlags.Instance | BindingFlags.NonPublic)!;
        private (double X, double Y) anchor;
        private int stalledTicks;
        private int sidestepTicksLeft;
        private double sidestepDirection;
        private MovementInput lastMovement;

        public string Name => inner.Name;

        public MovementInput ChooseMovement(RunAgentObservation observation)
        {
            var player = (PlayerState)PlayerField.GetValue(simulation)!;
            player.Health = simulation.MaxHealth;
            var movement = inner.ChooseMovement(observation);
            var position = observation.Snapshot.Player is { } snapshotPlayer ? (snapshotPlayer.X, snapshotPlayer.Y) : anchor;
            var moved = Math.Abs(position.Item1 - anchor.X) + Math.Abs(position.Item2 - anchor.Y) > 4;
            if (moved || !lastMovement.IsMoving) { anchor = position; stalledTicks = 0; }
            else stalledTicks++;
            lastMovement = movement;
            if (sidestepTicksLeft > 0)
            {
                sidestepTicksLeft--;
                return new MovementInput(sidestepDirection, 0);
            }
            if (stalledTicks > 20 && observation.Snapshot.Exit is not null && NearestPropX(observation, position) is { } blockerX)
            {
                stalledTicks = 0;
                sidestepTicksLeft = 30;
                sidestepDirection = position.Item1 < blockerX ? -1 : 1;
            }
            return movement;
        }

        private static double? NearestPropX(RunAgentObservation observation, (double X, double Y) position)
        {
            var world = observation.Snapshot.World;
            var props = observation.Snapshot.Environment?.Props;
            if (world is null || props is null || props.Count == 0) return null;
            return props.OrderBy(prop => Math.Abs(prop.X * world.Width - position.X) + Math.Abs(prop.Y * world.Height - position.Y))
                .Select(prop => prop.X * world.Width).First();
        }

        public string ChooseMapNode(RunAgentObservation observation) => inner.ChooseMapNode(observation);
        public LevelChoice ChooseLevelChoice(RunAgentObservation observation) => inner.ChooseLevelChoice(observation);
        public RelicId ChooseRelic(RunAgentObservation observation) => inner.ChooseRelic(observation);
        public DragonEssenceId ChooseEssence(RunAgentObservation observation) => inner.ChooseEssence(observation);
        public RunCheckpointActionId ChooseCheckpointAction(RunAgentObservation observation) => inner.ChooseCheckpointAction(observation);
    }
}
