using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.SelfPlay;

[TestClass]
public sealed class FireEvolutionHuntTests
{
    [TestMethod]
    [DataRow(1358, false)]
    [DataRow(1339, true)]
    public void RegularHunt_EarnsAndTriggersSolarWakeThroughLiveCombat(int seed, bool elderHunt)
    {
        var build = SelfPlayBuildCatalog.All.First(item => item.Goals.Contains("volcanic"));
        var simulation = new RunSimulationFactory(new SeededRandomSource(1)).Create(build.SelectedNodes,
            offering: DragonEssenceId.PhaseWing, seed: seed, fireballLevel: 5,
            hunt: elderHunt ? HuntSelection.FireTierThree : null,
            fireballMutations: [FireballMutationId.MeteorHeart, FireballMutationId.Detonation]);
        var agent = new EvolutionAgent(simulation,
            new HeuristicRunAgent(RunAgentPersonality.Greedy, seed, SpellSchool.Fire),
            new HeuristicRunAgent(RunAgentPersonality.Kiter, seed, SpellSchool.Fire));
        var result = new RunSelfPlayDriver().Play(build, seed, simulation, agent,
            new RunSelfPlayOptions(ArenaWidth: 368, ArenaHeight: 597, MaximumSimulatedSeconds: 720));

        Assert.IsTrue(result.Decisions.Any(decision => decision.StartsWith("draft:", StringComparison.Ordinal)
            && decision.EndsWith("Mega · Cinder Cascade", StringComparison.Ordinal)));
        Assert.IsTrue(result.Decisions.Any(decision => decision.StartsWith("draft:", StringComparison.Ordinal)
            && decision.EndsWith("Evolution · Solar Wake", StringComparison.Ordinal)));
        Assert.IsGreaterThanOrEqualTo(15, agent.EvolutionLevel);
        Assert.IsFalse(agent.FieldBeforeEvolution, "This loadout has no ordinary burning-ground source before Solar Wake.");
        Assert.IsTrue(agent.FieldAfterEvolution, "A real kill after earning Solar Wake must create a fire field.");
        Assert.AreEqual(5, simulation.PreparedFireballLevel);
        CollectionAssert.AreEquivalent(new[] { FireballMutationId.MeteorHeart, FireballMutationId.Detonation },
            simulation.PreparedFireballMutations.ToArray());
    }

    private sealed class EvolutionAgent(RunSimulation simulation, IRunAgent early, IRunAgent late) : IRunAgent
    {
        private bool emberbrand;
        private bool cascade;
        public int EvolutionLevel { get; private set; }
        public bool FieldBeforeEvolution { get; private set; }
        public bool FieldAfterEvolution { get; private set; }
        public string Name => "Fire evolution";

        public MovementInput ChooseMovement(RunAgentObservation observation)
        {
            if (observation.Snapshot.BurningGroundCount > 0)
            {
                FieldBeforeEvolution |= EvolutionLevel == 0;
                FieldAfterEvolution |= EvolutionLevel > 0;
            }
            return cascade ? late.ChooseMovement(observation) : early.ChooseMovement(observation);
        }

        public LevelChoice ChooseLevelChoice(RunAgentObservation observation)
        {
            var desired = cascade ? "SolarWake" : emberbrand ? "CinderCascade" : "Emberbrand";
            LevelChoice? FindDesired() => simulation.PendingChoices.FirstOrDefault(choice => choice.Id == "rune:" + desired);
            var choice = FindDesired();
            var level = observation.Snapshot.Hud.Level + 1;
            var minimumLevel = cascade ? 15 : emberbrand ? 10 : 5;
            if (choice is null && EvolutionLevel == 0 && level >= minimumLevel
                && observation.LevelChoices.Any(item => item.Hint?.Contains("BREAKTHROUGH", StringComparison.Ordinal) == true))
            {
                for (var slot = 0; slot < observation.LevelChoices.Count && choice is null; slot++)
                {
                    simulation.RerollChoice(slot);
                    choice = FindDesired();
                }
            }

            if (choice is null)
                return simulation.PendingChoices.FirstOrDefault(item => item.Id == "rune:Multicast")
                    ?? early.ChooseLevelChoice(observation with { LevelChoices = simulation.PendingChoices });

            emberbrand |= desired == "Emberbrand";
            cascade |= desired == "CinderCascade";
            if (desired == "SolarWake") EvolutionLevel = level;
            return choice;
        }

        public string ChooseMapNode(RunAgentObservation observation) => early.ChooseMapNode(observation);
        public RelicId ChooseRelic(RunAgentObservation observation) => early.ChooseRelic(observation);
        public DragonEssenceId ChooseEssence(RunAgentObservation observation) => early.ChooseEssence(observation);
        public RunCheckpointActionId ChooseCheckpointAction(RunAgentObservation observation) => early.ChooseCheckpointAction(observation);
    }
}
