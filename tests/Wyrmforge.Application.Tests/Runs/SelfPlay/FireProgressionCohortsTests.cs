using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Application.Tests.Runs.SelfPlay;

[TestClass]
public sealed class FireProgressionCohortsTests
{
    [TestMethod]
    public void ProgressionCohorts_UseLegalFireRoutesAndEquippedMutations()
    {
        Assert.AreEqual(4, FireProgressionCohorts.All.Count);
        var names = new HashSet<string>(StringComparer.Ordinal);
        foreach (var cohort in FireProgressionCohorts.All)
        {
            Assert.IsTrue(names.Add(cohort.Name), "Diagnostic cohort names must be stable.");
            Assert.IsTrue(cohort.CoreLevel is >= 1 and <= 5);
            Assert.IsLessThanOrEqualTo(24, cohort.Build.SpentPoints);
            Assert.AreEqual(cohort.Build.SpentPoints,
                cohort.Build.SelectedNodes.Sum(id => PassiveTreeCatalog.Get(id).Cost));
            Assert.IsTrue(cohort.Build.SelectedNodes.All(id => ArcaneSchoolCatalog.Owner(PassiveTreeCatalog.Get(id)) == PassiveSchool.Fire));
            Assert.IsLessThanOrEqualTo(cohort.CoreLevel, 5);
            Assert.IsLessThanOrEqualTo(cohort.EquippedMutations.Count, cohort.CoreLevel);

            var descriptions = cohort.EquippedMutations
                .Select(MutationAmplifierCatalog.ForFireball).OfType<MutationEffectDescriptor>().ToArray();
            var sockets = MutationAmplifierCatalog.CreateSockets();
            foreach (var assignment in cohort.Amplifiers)
            {
                var descriptor = descriptions.Single(item => item.SpellId == assignment.SpellId && item.MutationId == assignment.MutationId);
                Assert.IsTrue(sockets.Assign(assignment.NodeId, descriptor, cohort.Build.SelectedNodes, descriptions));
            }
        }
    }

    [TestMethod]
    public void ProgressionCohorts_CreateRealRunWithFrozenCoreAndSocketEffects()
    {
        var factory = new RunSimulationFactory(new SeededRandomSource(1));
        foreach (var cohort in FireProgressionCohorts.All)
        {
            var run = factory.Create(cohort.Build.SelectedNodes, seed: 54321,
                fireballLevel: cohort.CoreLevel, fireballMutations: cohort.EquippedMutations,
                amplifierAssignments: cohort.Amplifiers);
            Assert.AreEqual(cohort.CoreLevel, run.PreparedFireballLevel, cohort.Name);
            Assert.AreEqual(cohort.EquippedMutations.Count, run.PreparedFireballMutations.Count, cohort.Name);
            Assert.AreEqual(cohort.Amplifiers.Count, run.PreparedMutationAmplifiers.Count, cohort.Name);
        }
    }

    [TestMethod]
    public void CrownAndFurnace_SpecializationsAmplifyOnlyTheirEquippedEffect()
    {
        var factory = new RunSimulationFactory(new SeededRandomSource(1));
        var crown = FireProgressionCohorts.All.Single(item => item.Name == "Fire • Crown of Ash");
        var furnace = FireProgressionCohorts.All.Single(item => item.Name == "Fire • Heart of Furnace");

        var detonation = factory.Create(crown.Build.SelectedNodes, seed: 101,
            fireballLevel: crown.CoreLevel, fireballMutations: crown.EquippedMutations,
            amplifierAssignments: crown.Amplifiers);
        var scorch = factory.Create(furnace.Build.SelectedNodes, seed: 101,
            fireballLevel: furnace.CoreLevel, fireballMutations: furnace.EquippedMutations,
            amplifierAssignments: furnace.Amplifiers);

        Assert.AreEqual(1.2, detonation.PreparedMutationEffectFactor(FireballMutationId.Detonation,
            MutationEffectCapability.Area), 0.00001);
        Assert.AreEqual(1d, detonation.PreparedMutationEffectFactor(FireballMutationId.ScorchedEarth,
            MutationEffectCapability.Duration), 0.00001);
        Assert.AreEqual(1.25, scorch.PreparedMutationEffectFactor(FireballMutationId.ScorchedEarth,
            MutationEffectCapability.Duration), 0.00001);
        Assert.AreEqual(1d, scorch.PreparedMutationEffectFactor(FireballMutationId.Detonation,
            MutationEffectCapability.Area), 0.00001);
    }
}
