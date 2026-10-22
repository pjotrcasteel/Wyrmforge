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
            Assert.IsLessThanOrEqualTo(cohort.CoreLevel, cohort.EquippedMutations.Count);

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
    public void CrownAndFurnace_SpecializationsSaveCompatibleAndEffectScopedAmplifiers()
    {
        var factory = new RunSimulationFactory(new SeededRandomSource(1));
        foreach (var cohort in FireProgressionCohorts.All.Where(item => item.Amplifiers.Count > 0))
        {
            var run = factory.Create(cohort.Build.SelectedNodes, seed: 101,
                fireballLevel: cohort.CoreLevel, fireballMutations: cohort.EquippedMutations,
                amplifierAssignments: cohort.Amplifiers);

            var sockets = MutationAmplifierCatalog.CreateSockets();
            sockets.Restore(run.PreparedMutationAmplifiers);
            var equipped = cohort.EquippedMutations
                .Select(MutationAmplifierCatalog.ForFireball).OfType<MutationEffectDescriptor>().ToArray();
            var descriptor = equipped.Single(item => item.MutationId == cohort.Amplifiers.Single().MutationId);
            var effect = cohort.Name.Contains("Crown", StringComparison.Ordinal)
                ? MutationEffectCapability.Area : MutationEffectCapability.Duration;

            Assert.IsGreaterThan(1d, sockets.FactorFor(descriptor, effect, cohort.Build.SelectedNodes, equipped));
            Assert.AreEqual(1d, sockets.FactorFor(descriptor,
                effect == MutationEffectCapability.Area ? MutationEffectCapability.Duration : MutationEffectCapability.Area,
                cohort.Build.SelectedNodes, equipped), 0.00001);
        }
    }

}
