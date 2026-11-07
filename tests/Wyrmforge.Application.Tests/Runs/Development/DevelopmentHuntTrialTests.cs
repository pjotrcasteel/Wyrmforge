using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Application.Tests.Runs.Development;

[TestClass]
public sealed class DevelopmentHuntTrialTests
{
    private static readonly SelfPlayBuildDefinition Build = SelfPlayBuildCatalog.All.First();

    [TestMethod]
    public void FireEvolutionReview_UsesPermanentCoreAndTemporaryPowersWithoutLeakingToNextRun()
    {
        var factory = new RunSimulationFactory(new SeededRandomSource(1));
        var setup = new DevelopmentHuntSetup(DragonId.Ashfang, false, 1, SpellId.FireBolt, 1337, 390, 844)
        { ReviewFireEvolution = true, BossReadySpell = false };
        var review = factory.CreateDevelopmentHunt(Build.SelectedNodes, setup);
        var normal = factory.Create(Build.SelectedNodes, seed: setup.Seed);
        Assert.AreEqual(5, review.PreparedFireballLevel);
        Assert.AreEqual(1, review.PreparedFireballMutations.Count);
        Assert.AreEqual(1, review.CreateSnapshot().Hud.Spells.Single(spell => spell.Name == SpellCatalog.Get(SpellId.FireBolt).Name).Rank);
        Assert.AreEqual(1, normal.PreparedFireballLevel);
        Assert.AreEqual(0, normal.PreparedFireballMutations.Count);
        Assert.AreEqual(0, normal.SynergyEffectsResolved);
        Assert.AreEqual(0, review.CompletedMapNodes.Count);
        Assert.ThrowsExactly<ArgumentException>(() => factory.CreateDevelopmentHunt(Build.SelectedNodes, setup with { BossReadySpell = true }));
    }

    [TestMethod]
    [DataRow(368, 597, .05, FireballMutationId.CinderNeedle, true)]
    [DataRow(368, 597, .0166666667, FireballMutationId.CinderNeedle, false)]
    [DataRow(298, 420, .05, FireballMutationId.CinderNeedle, true)]
    [DataRow(298, 420, .0166666667, FireballMutationId.CinderNeedle, true)]
    public void FireEvolutionReview_RespectsLiveKillConditions(int width, int height, double delta, FireballMutationId mutation, bool expectedField)
    {
        var selection = new PassiveTreeSelection();
        selection.SetActiveSchool(PassiveSchool.Fire);
        selection.SelectPath(PassiveTreePlanner.Plan(selection, "fire-long-pyre")!.NodeIds);
        var setup = new DevelopmentHuntSetup(DragonId.Ashfang, false, 2, SpellId.FireBolt, 1337, width, height, true)
        { ReviewFireEvolution = true, BossReadySpell = false, Environment = true, ReviewMutation = mutation };
        var run = new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentHunt(selection.Selected, setup);
        var agent = new HeuristicRunAgent(RunAgentPersonality.Kiter, 1337, Build.PreferredSchool);
        var snapshot = run.CreateSnapshot();
        var sawField = false;
        for (var step = 0; step * delta < 120 && snapshot.Dragon is not null && !run.IsEnded; step++)
        {
            var observation = new RunAgentObservation(snapshot, [], [], [], [], [], run.Depth, 0, false);
            snapshot = run.Tick(delta, agent.ChooseMovement(observation), width, height);
            sawField |= snapshot.BurningGroundCount > 0;
        }
        // Different input timing can put the killing hit outside the burn window.
        // Keep the negative encounter: the evolution must not turn every boss death into a guaranteed proc.
        Assert.AreEqual(expectedField, sawField, $"time={snapshot.Hud.Seconds}, boss={snapshot.Dragon?.Health}, effects={run.SynergyEffectsResolved}");
    }

    [DataRow(DragonId.Ashfang, true, "Crownfall")]
    [DataRow(DragonId.Stormcoil, true, "Skybreak Crossing")]
    [DataRow(DragonId.Rimeclaw, false, "Glacial Wall")]
    [TestMethod]
    public void CreateDevelopmentHunt_ChosenEncounter_SkipsRoutesWithoutPersistingVictory(DragonId wyrm, bool ascendant, string signature)
    {
        var factory = new RunSimulationFactory(new SeededRandomSource(1));
        var spell = wyrm switch { DragonId.Ashfang => SpellId.FireBolt, DragonId.Stormcoil => SpellId.ChainLightning, _ => SpellId.FrostShard };
        var run = factory.CreateDevelopmentHunt(Build.SelectedNodes, new DevelopmentHuntSetup(wyrm, ascendant, 1, spell, 721, 390, 844));

        Assert.AreEqual(2, run.Depth);
        Assert.IsFalse(run.CreateSnapshot().Paused);
        Assert.IsNotNull(run.CreateSnapshot().Dragon);
        Assert.AreEqual(ascendant, run.CreateSnapshot().Dragon!.IsAscendant);
        Assert.AreEqual(signature, run.CreateSnapshot().Hunt?.SignatureName);
        Assert.AreEqual(0, run.CompletedMapNodes.Count);
        Assert.AreEqual(0, run.CreateEvaluationSummary().AscendantDragonIds.Count);
    }

    [TestMethod]
    public void CreateDevelopmentHunt_PhaseTwoAndPractice_AreIsolatedFromOrdinaryRun()
    {
        var factory = new RunSimulationFactory(new SeededRandomSource(1));
        var setup = new DevelopmentHuntSetup(DragonId.Stormcoil, true, 2, SpellId.ChainLightning, 1337, 390, 844, true);
        var practice = factory.CreateDevelopmentHunt(Build.SelectedNodes, setup);
        var normal = factory.Create(Build.SelectedNodes, seed: setup.Seed);

        Assert.AreEqual(2, practice.CreateSnapshot().Dragon?.Phase);
        Assert.AreEqual("Skybreak Crossing", practice.CreateSnapshot().Hunt?.SignatureName);
        Assert.IsFalse(normal.CreateSnapshot().Dragon is not null);
        Assert.IsTrue(normal.CreateSnapshot().Paused);
        Assert.IsFalse(normal.AscendantRiteSelected);
    }

    [TestMethod]
    public void CreateDevelopmentHunt_UnimplementedAscendant_IsRejected()
    {
        var factory = new RunSimulationFactory(new SeededRandomSource(1));
        Assert.ThrowsExactly<ArgumentException>(() => factory.CreateDevelopmentHunt(Build.SelectedNodes,
            new DevelopmentHuntSetup(DragonId.Voidweaver, true, 1, SpellId.ArcaneOrb, 1337, 390, 844)));
    }

    [TestMethod]
    public void Run_IdenticalSeedAndAgent_ProducesIdenticalEncounterEvidence()
    {
        var setup = new DevelopmentHuntSetup(DragonId.Stormcoil, true, 1, SpellId.ChainLightning, 4567, 390, 844);
        var runner = new DevelopmentHuntTrial();
        var first = runner.Run(Build, setup, RunAgentPersonality.Kiter, 16);
        var second = runner.Run(Build, setup, RunAgentPersonality.Kiter, 16);

        Assert.AreEqual(first, second);
        Assert.IsGreaterThan(0, first.DurationSeconds);
        Assert.IsGreaterThan(0, first.SignatureWarningFrames);
        Assert.IsTrue(first.MinimumHealthRatio is >= 0 and <= 1);
    }

    [TestMethod]
    public void Run_PortraitAndLandscape_PracticeCanObservePhaseTwoTelegraphsWithoutDying()
    {
        var runner = new DevelopmentHuntTrial();
        foreach (var (width, height) in new[] { (390d, 844d), (844d, 390d) })
        {
            var setup = new DevelopmentHuntSetup(DragonId.Stormcoil, true, 2, SpellId.ChainLightning, 555, width, height, true);
            var result = runner.Run(Build, setup, RunAgentPersonality.Casual, 15);
            Assert.IsFalse(result.Defeated);
            Assert.IsTrue(result.ReachedSecondPhase);
            Assert.IsGreaterThan(0, result.SignatureWarningFrames);
            Assert.AreEqual(0, result.DamageTaken);
        }
    }
}
