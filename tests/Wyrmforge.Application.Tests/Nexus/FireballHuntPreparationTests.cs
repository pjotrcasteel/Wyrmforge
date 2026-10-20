using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
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
            fireballMutations: [FireballMutationId.MeteorHeart, FireballMutationId.MeteorHeart,
                FireballMutationId.Detonation, FireballMutationId.CinderNeedle]);

        CollectionAssert.AreEquivalent(
            new[] { FireballMutationId.MeteorHeart, FireballMutationId.Detonation },
            simulation.PreparedFireballMutations.ToArray());
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        Assert.IsTrue(simulation.PreparedFireballMutations.Contains(FireballMutationId.MeteorHeart));
    }

    [TestMethod]
    public void PreparedMutation_AfterPrimaryCommitted_CannotBeReplacedMidHunt()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 2402,
            fireballMutations: [FireballMutationId.ScorchedEarth]);

        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        simulation.PrepareFireballMutations([FireballMutationId.MeteorHeart]);
        Assert.IsTrue(simulation.PreparedFireballMutations.Contains(FireballMutationId.ScorchedEarth));
        Assert.IsFalse(simulation.PreparedFireballMutations.Contains(FireballMutationId.MeteorHeart));
    }
}
