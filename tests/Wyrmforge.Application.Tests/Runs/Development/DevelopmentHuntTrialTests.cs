using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Development;

[TestClass]
public sealed class DevelopmentHuntTrialTests
{
    private static readonly SelfPlayBuildDefinition Build = SelfPlayBuildCatalog.All.First();

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
