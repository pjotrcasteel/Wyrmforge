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

namespace Wyrmforge.Application.Tests.Runs.Navigation;

/// <summary>Plays the real Fire Tier-I Hunt, route to Ashfang to extraction, through the public simulation API.</summary>
[TestClass]
public sealed class FireTierOneFullLoopTests
{
    private const int PhoneWidth = 390;
    private const int PhoneHeight = 700;

    public TestContext TestContext { get; set; } = null!;

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

    [TestMethod]
    [DataRow(42)]
    [DataRow(1204)]
    public void FullHunt_DamageableAgent_ReachesAnHonestNaturalOutcome(int seed)
    {
        var result = PlayFullHunt(seed, damageable: true);
        TestContext.WriteLine($"seed={seed} outcome={result.Metrics.Outcome} stop={result.Metrics.StopReason} " +
            $"healthMin={result.Metrics.MinimumHealthRatio:F3} damageTaken={result.Metrics.DamageTaken:F1} " +
            $"routes={result.Metrics.CompletedRouteNodes} boss={result.Metrics.WyrmsReached} " +
            $"victories={result.Metrics.DragonsSlain} essenceSecured={result.Metrics.EssenceSecured} " +
            $"rituals={result.Metrics.ExtractionRitualsCompleted} seconds={result.Metrics.SimulatedSeconds:F1}");

        Assert.AreEqual(RunSelfPlayStopReason.NaturalEnd, result.Metrics.StopReason,
            "The damageable agent must reach a natural death or extraction rather than time out or abandon.");
        Assert.IsTrue(result.Metrics.Outcome is RunOutcome.Defeated or RunOutcome.Extracted,
            "A genuine defeat is valid evidence, not proof of a successful extraction.");
        Assert.IsGreaterThan(0, result.Metrics.DamageTaken, "This trial must expose the mage to real combat damage.");
        Assert.IsLessThan(1, result.Metrics.MinimumHealthRatio, "Health must not be silently reset by the agent.");
    }

    private static (RunSelfPlayMetrics Metrics, RunSimulation Simulation) PlayFullHunt(int seed, bool damageable = false)
    {
        var simulation = new RunSimulationFactory(new SeededRandomSource(seed))
            .Create(new HashSet<string>(), seed: seed, hunt: HuntSelection.FireTierOne);
        var build = SelfPlayBuildCatalog.Get("Fire • Inferno");
        var heuristic = new HeuristicRunAgent(RunAgentPersonality.BuildFocused, seed, build.PreferredSchool);
        IRunAgent agent = damageable ? new ExitPathAssistAgent(heuristic) : new InvulnerableAgent(heuristic, simulation);
        var metrics = new RunSelfPlayDriver().Play(build, seed, simulation, agent,
            new RunSelfPlayOptions(ArenaWidth: PhoneWidth, ArenaHeight: PhoneHeight,
                MaximumSimulatedSeconds: damageable ? 900 : 3600,
                MaximumWallClockSeconds: damageable ? 60 : double.PositiveInfinity));
        return (metrics, simulation);
    }

    // Spells pause during the walk to the exit, so both agents sidestep a blocking prop as a player would.
    // This adapter only returns controller input. It never changes player health, position, damage or rewards.
    private class ExitPathAssistAgent(IRunAgent inner) : IRunAgent
    {
        private (double X, double Y) anchor;
        private int stalledTicks;
        private int sidestepTicksLeft;
        private double sidestepDirection;
        private MovementInput lastMovement;

        public string Name => inner.Name;

        public virtual MovementInput ChooseMovement(RunAgentObservation observation)
        {
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

    // Structural smoke only: health is restored so balance-dependent death cannot hide a navigation regression.
    // The separate damageable-agent test above must never use this subclass.
    private sealed class InvulnerableAgent(IRunAgent inner, RunSimulation simulation) : ExitPathAssistAgent(inner)
    {
        private static readonly FieldInfo PlayerField = typeof(RunSimulation).GetField("player", BindingFlags.Instance | BindingFlags.NonPublic)!;

        public override MovementInput ChooseMovement(RunAgentObservation observation)
        {
            var player = (PlayerState)PlayerField.GetValue(simulation)!;
            player.Health = simulation.MaxHealth;
            return base.ChooseMovement(observation);
        }
    }
}
