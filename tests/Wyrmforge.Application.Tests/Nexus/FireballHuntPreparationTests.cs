using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Nexus;

[TestClass]
public sealed class FireballHuntPreparationTests
{
    [TestMethod]
    public void Create_WithPreparedFireballMutation_PreservesOnlyPlayableUniqueEffects()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 2401,
            fireballLevel: 4,
            fireballMutations: [FireballMutationId.MeteorHeart, FireballMutationId.MeteorHeart,
                FireballMutationId.Detonation, FireballMutationId.CinderNeedle]);

        CollectionAssert.AreEquivalent(
            new[] { FireballMutationId.MeteorHeart, FireballMutationId.Detonation, FireballMutationId.CinderNeedle },
            simulation.PreparedFireballMutations.ToArray());
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        Assert.IsTrue(simulation.PreparedFireballMutations.Contains(FireballMutationId.MeteorHeart));
    }

    [TestMethod]
    public void PreparedMutation_AfterPrimaryCommitted_CannotBeReplacedMidHunt()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 2402,
            fireballLevel: 2,
            fireballMutations: [FireballMutationId.ScorchedEarth]);

        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        simulation.PrepareFireballMutations([FireballMutationId.MeteorHeart]);
        Assert.IsTrue(simulation.PreparedFireballMutations.Contains(FireballMutationId.ScorchedEarth));
        Assert.IsFalse(simulation.PreparedFireballMutations.Contains(FireballMutationId.MeteorHeart));
    }

    [TestMethod]
    public void FreshLevelOneFireball_RejectsInjectedMutatorEvenIfItWasPreviouslyLearned()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 2404,
            fireballLevel: 1, fireballMutations: [FireballMutationId.Detonation]);

        Assert.AreEqual(1, simulation.PreparedFireballLevel);
        Assert.AreEqual(0, simulation.PreparedFireballMutations.Count);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        Assert.AreEqual(0, simulation.PreparedFireballMutations.Count);
    }

    [TestMethod]
    public void PreparedMutators_RespectCurrentCoreCapacityAndCannotSurviveLevelDowngrade()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 2405,
            fireballLevel: 5,
            fireballMutations: [FireballMutationId.Detonation, FireballMutationId.MeteorHeart, FireballMutationId.ScorchedEarth]);

        Assert.AreEqual(3, simulation.PreparedFireballMutations.Count);
        simulation.PrepareFireballCoreLevel(2);
        Assert.AreEqual(1, simulation.PreparedFireballMutations.Count);
        simulation.PrepareFireballCoreLevel(1);
        Assert.AreEqual(0, simulation.PreparedFireballMutations.Count);
    }

    [TestMethod]
    public void EvaluationSummary_PreservesPreparedSignatureAndHuntTierForMasteryAttribution()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 2403,
            fireballLevel: 3, fireballMutations: [FireballMutationId.Detonation, FireballMutationId.CinderNeedle],
            hunt: HuntSelection.FireTierTwo);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));

        var summary = simulation.CreateEvaluationSummary();

        Assert.AreEqual(SpellId.FireBolt, summary.ActiveSpell);
        Assert.AreEqual(3, summary.PreparedFireballLevel);
        Assert.AreEqual(HuntSelection.FireTierTwo, summary.Hunt);
        CollectionAssert.AreEquivalent(new[] { FireballMutationId.Detonation, FireballMutationId.CinderNeedle },
            summary.PreparedFireballMutations.ToArray());
    }
}
