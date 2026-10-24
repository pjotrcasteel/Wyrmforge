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
