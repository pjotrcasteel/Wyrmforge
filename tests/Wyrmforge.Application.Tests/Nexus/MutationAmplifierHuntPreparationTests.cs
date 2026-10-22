using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Nexus;

[TestClass]
public sealed class MutationAmplifierHuntPreparationTests
{
    [TestMethod]
    public void Create_WithMutationAmplifierAssignments_PreservesTheHuntSnapshot()
    {
        var nodes = new HashSet<string> { "fire-spread-crown" };
        var bindings = new[] { new MutationAmplifierAssignment("fire-spread-crown", "FireBolt", "Detonation") };
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(nodes, seed: 2911,
            fireballMutations: [FireballMutationId.Detonation], amplifierAssignments: bindings);

        Assert.AreEqual(1, simulation.PreparedMutationAmplifiers.Count);
        Assert.AreEqual("fire-spread-crown", simulation.PreparedMutationAmplifiers[0].NodeId);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        Assert.AreEqual(1, simulation.PreparedMutationAmplifiers.Count);
    }

    [TestMethod]
    public void Create_WithLearnedCompatibleSocket_CalculatesBoundedMutationSpecificEffect()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string> { "fire-spread-crown", "fire-ember-altar" },
            seed: 2913, fireballMutations: [FireballMutationId.Detonation, FireballMutationId.ScorchedEarth],
            amplifierAssignments: [
                new("fire-spread-crown", "FireBolt", "Detonation"),
                new("fire-ember-altar", "FireBolt", "ScorchedEarth")
            ]);

        Assert.AreEqual(1.2, simulation.PreparedMutationEffectFactor(FireballMutationId.Detonation, MutationEffectCapability.Area), 0.00001);
        Assert.AreEqual(1.25, simulation.PreparedMutationEffectFactor(FireballMutationId.ScorchedEarth, MutationEffectCapability.Duration), 0.00001);
        Assert.AreEqual(1, simulation.PreparedMutationEffectFactor(FireballMutationId.Detonation, MutationEffectCapability.Duration), 0.00001);
    }

    [TestMethod]
    public void Create_WithoutLearnedNodeOrEquippedMutation_DoesNotAmplify()
    {
        var binding = new MutationAmplifierAssignment("fire-spread-crown", "FireBolt", "Detonation");
        var factory = new RunSimulationFactory(new FirstRandomSource());
        var unlearned = factory.Create(new HashSet<string>(), seed: 2914,
            fireballMutations: [FireballMutationId.Detonation], amplifierAssignments: [binding]);
        var unequipped = factory.Create(new HashSet<string> { "fire-spread-crown" }, seed: 2915,
            fireballMutations: [FireballMutationId.ScorchedEarth], amplifierAssignments: [binding]);

        Assert.AreEqual(1, unlearned.PreparedMutationEffectFactor(FireballMutationId.Detonation, MutationEffectCapability.Area), 0.00001);
        Assert.AreEqual(1, unequipped.PreparedMutationEffectFactor(FireballMutationId.Detonation, MutationEffectCapability.Area), 0.00001);
    }

    [TestMethod]
    public void PrepareMutationAmplifiers_AfterCommittingPrimary_RejectsChanges()
    {
        var initial = new MutationAmplifierAssignment("fire-spread-crown", "FireBolt", "Detonation");
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string> { "fire-spread-crown" },
            seed: 2912, fireballMutations: [FireballMutationId.Detonation], amplifierAssignments: [initial]);

        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        simulation.PrepareMutationAmplifiers([new("fire-ember-altar", "FireBolt", "ScorchedEarth")]);

        Assert.AreEqual(1, simulation.PreparedMutationAmplifiers.Count);
        Assert.AreEqual(initial, simulation.PreparedMutationAmplifiers[0]);
    }
}
