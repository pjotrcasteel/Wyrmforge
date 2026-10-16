using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Domain.Tests.Progression.Laboratory;

[TestClass]
public sealed class LaboratoryStateTests
{
    private static readonly IReadOnlySet<string> SocketNodes = new HashSet<string> { "wyrmheart", "hybrid-fire-frost-2" };

    private static DragonEssenceVault VaultWith(params DragonEssenceId[] essences)
    {
        var vault = new DragonEssenceVault();
        vault.Restore(essences);
        return vault;
    }

    private static LaboratoryState Researched(DragonEssenceVault vault)
    {
        var lab = new LaboratoryState();
        lab.Run(LaboratoryExperimentId.ExamineRimeHeart, vault);
        lab.Run(LaboratoryExperimentId.InfuseFireBoltWithRime, vault);
        lab.Run(LaboratoryExperimentId.ChillThenIgnite, vault);
        return lab;
    }

    [TestMethod]
    public void Catalog_RimeInfusion_RealizesFrostfireOnFireBoltThroughAnExistingArcaneWebNode()
    {
        var mutation = LaboratoryCatalog.Get(LaboratoryMutationId.RimeInfusion);
        Assert.AreEqual(SpellId.FireBolt, mutation.Foundation);
        Assert.AreEqual(SynergyId.Frostfire, mutation.Realizes);
        var socket = LaboratoryCatalog.Get(mutation.Socket);
        Assert.IsTrue(PassiveTreeCatalog.All.Any(node => node.Id == socket.NodeId && node.Name == socket.NodeName));
        Assert.IsTrue(LaboratoryCatalog.Experiments.Any(experiment => experiment.Outcome == LaboratoryExperimentOutcome.InstructiveFailure));
        Assert.IsTrue(LaboratoryCatalog.Experiments.All(experiment => experiment.Finding.Length > 0 && experiment.NextStep.Length > 0));
    }

    [TestMethod]
    public void Run_WithoutSample_IsRejectedAndRecordsNothing()
    {
        var lab = new LaboratoryState();
        var result = lab.Run(LaboratoryExperimentId.ExamineRimeHeart, new DragonEssenceVault());
        Assert.IsTrue(result.Rejected);
        Assert.AreEqual(0, lab.Observations.Count);
        Assert.AreEqual(ExperimentAvailability.MissingObservation, lab.Availability(LaboratoryExperimentId.ChillThenIgnite, new DragonEssenceVault()));
    }

    [TestMethod]
    public void Run_ExaminingSample_RecordsInsightWithoutConsumingIt()
    {
        var vault = VaultWith(DragonEssenceId.RimeHeart);
        var lab = new LaboratoryState();
        var result = lab.Run(LaboratoryExperimentId.ExamineRimeHeart, vault);
        Assert.IsTrue(result.Novel);
        Assert.IsTrue(lab.HasObserved(LaboratoryObservationId.RimePreservesCold));
        Assert.AreEqual(1, vault.Count(DragonEssenceId.RimeHeart));
    }

    [TestMethod]
    public void Run_FailedExperiment_TeachesSpecificInformationOnceAndCannotBeFarmed()
    {
        var vault = VaultWith(DragonEssenceId.RimeHeart);
        var lab = new LaboratoryState();
        lab.Run(LaboratoryExperimentId.ExamineRimeHeart, vault);

        var failure = lab.Run(LaboratoryExperimentId.InfuseFireBoltWithRime, vault);
        Assert.AreEqual(LaboratoryExperimentOutcome.InstructiveFailure, failure.Experiment.Outcome);
        Assert.IsTrue(failure.Novel);
        Assert.IsTrue(lab.HasObserved(LaboratoryObservationId.ThermalShockUnstable));
        Assert.AreEqual(ExperimentAvailability.Ready, lab.Availability(LaboratoryExperimentId.ChillThenIgnite, vault), "The failure unlocks the next step.");

        var before = lab.ToSave();
        var repeat = lab.Run(LaboratoryExperimentId.InfuseFireBoltWithRime, vault);
        Assert.IsFalse(repeat.Novel);
        Assert.IsFalse(repeat.Rejected);
        Assert.AreEqual(before, lab.ToSave() with { Observations = before.Observations, Mutations = before.Mutations });
        CollectionAssert.AreEqual(before.Observations, lab.ToSave().Observations);
    }

    [TestMethod]
    public void Run_Incompatibility_IsADeadEndThatDoesNotGateTheMutation()
    {
        var vault = VaultWith(DragonEssenceId.RimeHeart);
        var lab = Researched(vault);
        Assert.AreEqual(MutationResearchStatus.ReadyToStabilize, lab.Status(LaboratoryMutationId.RimeInfusion, vault));
        Assert.IsFalse(lab.HasObserved(LaboratoryObservationId.QuenchingSmothersFlame));
        Assert.IsTrue(lab.Run(LaboratoryExperimentId.QuenchFireBoltInRime, vault).Novel);
    }

    [TestMethod]
    public void Stabilize_RequiresExplicitConsentAndConsumesExactlyOneRimeHeart()
    {
        var vault = VaultWith(DragonEssenceId.RimeHeart, DragonEssenceId.RimeHeart, DragonEssenceId.CinderHeart);
        var lab = Researched(vault);

        Assert.IsFalse(lab.Stabilize(LaboratoryMutationId.RimeInfusion, vault, consentToConsume: false));
        Assert.AreEqual(2, vault.Count(DragonEssenceId.RimeHeart));

        Assert.IsTrue(lab.Stabilize(LaboratoryMutationId.RimeInfusion, vault, consentToConsume: true));
        Assert.AreEqual(1, vault.Count(DragonEssenceId.RimeHeart));
        Assert.AreEqual(1, vault.Count(DragonEssenceId.CinderHeart));
        Assert.AreEqual(MutationResearchStatus.Stabilized, lab.Status(LaboratoryMutationId.RimeInfusion, vault));

        Assert.IsFalse(lab.Stabilize(LaboratoryMutationId.RimeInfusion, vault, consentToConsume: true));
        Assert.AreEqual(1, vault.Count(DragonEssenceId.RimeHeart), "A stabilized recipe never spends again.");
    }

    [TestMethod]
    public void Stabilize_WithoutObservationsOrSpecimen_SpendsNothing()
    {
        var vault = VaultWith(DragonEssenceId.RimeHeart);
        var lab = new LaboratoryState();
        Assert.AreEqual(MutationResearchStatus.MissingObservations, lab.Status(LaboratoryMutationId.RimeInfusion, vault));
        Assert.IsFalse(lab.Stabilize(LaboratoryMutationId.RimeInfusion, vault, consentToConsume: true));
        Assert.AreEqual(1, vault.Count(DragonEssenceId.RimeHeart));

        var researched = Researched(vault);
        var empty = new DragonEssenceVault();
        Assert.AreEqual(MutationResearchStatus.MissingStabilizer, researched.Status(LaboratoryMutationId.RimeInfusion, empty));
        Assert.IsFalse(researched.Stabilize(LaboratoryMutationId.RimeInfusion, empty, consentToConsume: true));
    }

    [TestMethod]
    public void Equip_RequiresStabilizedRecipeAndUnlockedSocket()
    {
        var vault = VaultWith(DragonEssenceId.RimeHeart);
        var lab = Researched(vault);
        Assert.AreEqual(MutationEquipResult.NotStabilized, lab.Equip(LaboratoryMutationId.RimeInfusion, SocketNodes));
        lab.Stabilize(LaboratoryMutationId.RimeInfusion, vault, consentToConsume: true);
        Assert.AreEqual(MutationEquipResult.SocketLocked, lab.Equip(LaboratoryMutationId.RimeInfusion, new HashSet<string> { "wyrmheart" }));
        Assert.AreEqual(0, lab.EquippedMutations.Count);
        Assert.AreEqual(MutationEquipResult.Equipped, lab.Equip(LaboratoryMutationId.RimeInfusion, SocketNodes));
        CollectionAssert.AreEqual(new[] { LaboratoryMutationId.RimeInfusion }, lab.PreparedFor(SocketNodes).ToArray());
    }

    [TestMethod]
    public void ReconcileSocket_RespecRemovesSocket_UnequipsWithMessageAndKeepsRecipe()
    {
        var vault = VaultWith(DragonEssenceId.RimeHeart);
        var lab = Researched(vault);
        lab.Stabilize(LaboratoryMutationId.RimeInfusion, vault, consentToConsume: true);
        lab.Equip(LaboratoryMutationId.RimeInfusion, SocketNodes);

        Assert.IsNull(lab.ReconcileSocket(SocketNodes));
        var message = lab.ReconcileSocket(new HashSet<string> { "wyrmheart" });
        Assert.IsNotNull(message);
        StringAssert.Contains(message, "Rimebrand");
        Assert.AreEqual(0, lab.EquippedMutations.Count);
        Assert.IsTrue(lab.Stabilized.Contains(LaboratoryMutationId.RimeInfusion));
        Assert.IsNull(lab.ReconcileSocket(new HashSet<string>()), "Nothing further to unequip.");
    }

    [TestMethod]
    public void SaveRoundTrip_PreservesKnowledgeAndDropsUnknownIds()
    {
        var vault = VaultWith(DragonEssenceId.RimeHeart);
        var lab = Researched(vault);
        lab.Stabilize(LaboratoryMutationId.RimeInfusion, vault, consentToConsume: true);
        lab.Equip(LaboratoryMutationId.RimeInfusion, SocketNodes);
        lab.RecordFieldTest(LaboratoryMutationId.RimeInfusion, 7);
        lab.RecordFieldTest(null, 99);

        var save = lab.ToSave();
        var restored = new LaboratoryState();
        restored.Restore(save with { Observations = [.. save.Observations, "FutureObservation"], Mutations = [.. save.Mutations, "FutureMutation"] });
        Assert.AreEqual(save, restored.ToSave() with { Observations = save.Observations, Mutations = save.Mutations, Slots = save.Slots });
        CollectionAssert.AreEqual(save.Slots, restored.ToSave().Slots);
        CollectionAssert.AreEqual(save.Observations, restored.ToSave().Observations);
        CollectionAssert.AreEqual(save.Mutations, restored.ToSave().Mutations);
        Assert.AreEqual(1, restored.FieldTests);
        Assert.AreEqual(7, restored.FieldReactions);
        Assert.AreEqual(ArcaneMutationSocketId.Rimebrand, restored.SocketOf(LaboratoryMutationId.RimeInfusion));
    }

    [TestMethod]
    public void Restore_EquippedWithoutStabilizedRecipe_IsIgnored()
    {
        var lab = new LaboratoryState();
        lab.Restore(new LaboratorySave(1, [], [], "RimeInfusion", -3, -1));
        Assert.AreEqual(0, lab.EquippedMutations.Count);
        Assert.AreEqual(0, lab.FieldTests);
        lab.Restore(null);
        Assert.AreEqual(0, lab.Observations.Count);
    }
}
