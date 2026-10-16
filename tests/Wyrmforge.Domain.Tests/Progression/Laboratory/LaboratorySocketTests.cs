using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Laboratory;

namespace Wyrmforge.Domain.Tests.Progression.Laboratory;

[TestClass]
public sealed class LaboratorySocketTests
{
    private const string Rimebrand = "hybrid-fire-frost-2";
    private const string ChargedFocus = "hybrid-storm-arcane-2";
    private const string Flashfire = "hybrid-fire-storm-2";
    private const string GlacialLens = "hybrid-arcane-frost-2";

    private static IReadOnlySet<string> Nodes(params string[] ids) => new HashSet<string>(ids) { "wyrmheart" };

    internal static LaboratoryState BothStabilized()
    {
        var vault = new DragonEssenceVault();
        vault.Restore([DragonEssenceId.RimeHeart, DragonEssenceId.StormHeart]);
        var lab = new LaboratoryState();
        foreach (var experiment in new[]
        {
            LaboratoryExperimentId.ExamineRimeHeart, LaboratoryExperimentId.InfuseFireBoltWithRime, LaboratoryExperimentId.ChillThenIgnite,
            LaboratoryExperimentId.ExamineStormHeart, LaboratoryExperimentId.ChargeArcaneOrb, LaboratoryExperimentId.CountOrbImpacts,
        })
            lab.Run(experiment, vault);
        Assert.IsTrue(lab.Stabilize(LaboratoryMutationId.RimeInfusion, vault, consentToConsume: true));
        Assert.IsTrue(lab.Stabilize(LaboratoryMutationId.StormInfusion, vault, consentToConsume: true));
        return lab;
    }

    [TestMethod]
    public void Catalog_SocketsAreGenericByElement_AndEveryMutationFitsItsHomeSocket()
    {
        Assert.AreEqual(2, LaboratoryCatalog.MaxEquippedMutations);
        CollectionAssert.AreEquivalent(
            new[] { ArcaneMutationSocketId.Rimebrand, ArcaneMutationSocketId.Flashfire, ArcaneMutationSocketId.GlacialLens },
            LaboratoryCatalog.Get(LaboratoryMutationId.RimeInfusion).CompatibleSockets.ToArray());
        CollectionAssert.AreEquivalent(
            new[] { ArcaneMutationSocketId.ChargedFocus, ArcaneMutationSocketId.Flashfire, ArcaneMutationSocketId.GlacialLens },
            LaboratoryCatalog.Get(LaboratoryMutationId.StormInfusion).CompatibleSockets.ToArray());
        foreach (var mutation in LaboratoryCatalog.Mutations)
        {
            Assert.IsTrue(mutation.Validation.IsValid, mutation.Name);
            Assert.IsTrue(mutation.CompatibleSockets.Contains(mutation.Socket), mutation.Name);
        }
    }

    [TestMethod]
    public void Equip_IntoBridgeSocket_AcceptsCompatibleAndRejectsForeignElement()
    {
        var lab = BothStabilized();
        var nodes = Nodes(Flashfire, GlacialLens, ChargedFocus);
        Assert.AreEqual(MutationEquipResult.IncompatibleSocket, lab.Equip(LaboratoryMutationId.RimeInfusion, ArcaneMutationSocketId.ChargedFocus, nodes));
        Assert.AreEqual(MutationEquipResult.Equipped, lab.Equip(LaboratoryMutationId.RimeInfusion, ArcaneMutationSocketId.Flashfire, nodes));
        Assert.AreEqual(ArcaneMutationSocketId.Flashfire, lab.SocketOf(LaboratoryMutationId.RimeInfusion));
        Assert.AreEqual(MutationEquipResult.SocketLocked, lab.Equip(LaboratoryMutationId.StormInfusion, ArcaneMutationSocketId.Rimebrand, nodes));
    }

    [TestMethod]
    public void Equip_BothMutations_PrepareTogetherInSocketOrder()
    {
        var lab = BothStabilized();
        var nodes = Nodes(Rimebrand, ChargedFocus);
        Assert.AreEqual(MutationEquipResult.Equipped, lab.Equip(LaboratoryMutationId.StormInfusion, nodes));
        Assert.AreEqual(MutationEquipResult.Equipped, lab.Equip(LaboratoryMutationId.RimeInfusion, nodes));
        Assert.AreEqual(2, lab.Slotted.Count);
        CollectionAssert.AreEquivalent(new[] { LaboratoryMutationId.RimeInfusion, LaboratoryMutationId.StormInfusion }, lab.PreparedFor(nodes).ToArray());
        CollectionAssert.AreEqual(new[] { LaboratoryMutationId.StormInfusion }, lab.PreparedFor(Nodes(ChargedFocus)).ToArray(), "Only unlocked sockets prepare.");
    }

    [TestMethod]
    public void Equip_IntoAnotherSocket_MovesTheMutationAndSwapReplacesTheOccupant()
    {
        var lab = BothStabilized();
        var nodes = Nodes(Rimebrand, Flashfire, ChargedFocus);
        lab.Equip(LaboratoryMutationId.RimeInfusion, ArcaneMutationSocketId.Rimebrand, nodes);
        Assert.AreEqual(MutationEquipResult.Equipped, lab.Equip(LaboratoryMutationId.RimeInfusion, ArcaneMutationSocketId.Flashfire, nodes));
        Assert.AreEqual(1, lab.Slotted.Count, "Moving never duplicates.");
        Assert.AreEqual(ArcaneMutationSocketId.Flashfire, lab.SocketOf(LaboratoryMutationId.RimeInfusion));

        Assert.AreEqual(MutationEquipResult.Equipped, lab.Equip(LaboratoryMutationId.StormInfusion, ArcaneMutationSocketId.Flashfire, nodes));
        Assert.IsFalse(lab.IsEquipped(LaboratoryMutationId.RimeInfusion), "Swapping unequips the occupant.");
        Assert.IsTrue(lab.Stabilized.Contains(LaboratoryMutationId.RimeInfusion), "The recipe is kept.");
    }

    [TestMethod]
    public void CheckEquip_ReportsWithoutChangingAnything()
    {
        var lab = BothStabilized();
        var nodes = Nodes(Rimebrand);
        Assert.AreEqual(MutationEquipResult.Equipped, lab.CheckEquip(LaboratoryMutationId.RimeInfusion, ArcaneMutationSocketId.Rimebrand, nodes));
        Assert.AreEqual(MutationEquipResult.SocketLocked, lab.CheckEquip(LaboratoryMutationId.RimeInfusion, ArcaneMutationSocketId.GlacialLens, nodes));
        Assert.AreEqual(0, lab.Slotted.Count);
    }

    [TestMethod]
    public void Unequip_SingleMutation_LeavesTheOtherSocketAlone()
    {
        var lab = BothStabilized();
        var nodes = Nodes(Rimebrand, ChargedFocus);
        lab.Equip(LaboratoryMutationId.RimeInfusion, nodes);
        lab.Equip(LaboratoryMutationId.StormInfusion, nodes);
        Assert.IsTrue(lab.Unequip(LaboratoryMutationId.RimeInfusion));
        Assert.IsFalse(lab.Unequip(LaboratoryMutationId.RimeInfusion));
        CollectionAssert.AreEqual(new[] { LaboratoryMutationId.StormInfusion }, lab.EquippedMutations.ToArray());
    }

    [TestMethod]
    public void ReconcileSocket_OnlyUnequipsTheSocketWhoseNodeWasRefunded()
    {
        var lab = BothStabilized();
        lab.Equip(LaboratoryMutationId.RimeInfusion, Nodes(Rimebrand, ChargedFocus));
        lab.Equip(LaboratoryMutationId.StormInfusion, Nodes(Rimebrand, ChargedFocus));
        var message = lab.ReconcileSocket(Nodes(ChargedFocus));
        Assert.IsNotNull(message);
        StringAssert.Contains(message, "Rime Infusion");
        CollectionAssert.AreEqual(new[] { LaboratoryMutationId.StormInfusion }, lab.EquippedMutations.ToArray());
    }

    [TestMethod]
    public void SaveRoundTrip_KeepsBothSlotsAndStillWritesLegacyEquipped()
    {
        var lab = BothStabilized();
        var nodes = Nodes(Flashfire, ChargedFocus);
        lab.Equip(LaboratoryMutationId.RimeInfusion, ArcaneMutationSocketId.Flashfire, nodes);
        lab.Equip(LaboratoryMutationId.StormInfusion, ArcaneMutationSocketId.ChargedFocus, nodes);
        var save = lab.ToSave();
        Assert.IsNotNull(save.Slots);
        Assert.IsNotNull(save.Equipped, "Older builds still read one equipped mutation.");

        var restored = new LaboratoryState();
        restored.Restore(save);
        Assert.AreEqual(ArcaneMutationSocketId.Flashfire, restored.SocketOf(LaboratoryMutationId.RimeInfusion));
        Assert.AreEqual(ArcaneMutationSocketId.ChargedFocus, restored.SocketOf(LaboratoryMutationId.StormInfusion));
    }

    [TestMethod]
    public void Restore_LegacySaveWithoutSlots_MigratesIntoTheHomeSocket()
    {
        var save = BothStabilized().ToSave() with { Equipped = "StormInfusion", Slots = null };
        var lab = new LaboratoryState();
        lab.Restore(save);
        Assert.AreEqual(ArcaneMutationSocketId.ChargedFocus, lab.SocketOf(LaboratoryMutationId.StormInfusion));
    }

    [TestMethod]
    public void Restore_TamperedSlots_DropsIllegalEntries()
    {
        var save = BothStabilized().ToSave() with
        {
            Slots =
            [
                "ChargedFocus:RimeInfusion",
                "Rimebrand:RimeInfusion",
                "GlacialLens:RimeInfusion",
                "Flashfire:StormInfusion",
                "GlacialLens:StormInfusion",
                "Nowhere:StormInfusion",
                "garbage",
            ],
        };
        var lab = new LaboratoryState();
        lab.Restore(save);
        Assert.AreEqual(ArcaneMutationSocketId.Rimebrand, lab.SocketOf(LaboratoryMutationId.RimeInfusion), "Incompatible first entry skipped, duplicate later entry skipped.");
        Assert.AreEqual(ArcaneMutationSocketId.Flashfire, lab.SocketOf(LaboratoryMutationId.StormInfusion));
        Assert.AreEqual(2, lab.Slotted.Count);

        var unstabilized = new LaboratoryState();
        unstabilized.Restore(new LaboratorySave(1, [], [], null, 0, 0, Slots: ["Rimebrand:RimeInfusion"]));
        Assert.AreEqual(0, unstabilized.Slotted.Count);
    }

    [TestMethod]
    public void Advisor_WithOneMutationEquipped_SuggestsEquippingTheSecond()
    {
        var lab = BothStabilized();
        var nodes = Nodes(Rimebrand, ChargedFocus);
        lab.Equip(LaboratoryMutationId.RimeInfusion, nodes);
        var prompt = LaboratoryAdvisor.Next(lab, new DragonEssenceVault(), nodes);
        Assert.IsNotNull(prompt);
        Assert.AreEqual(LaboratoryPromptKind.Equip, prompt.Kind);
        Assert.AreEqual(LaboratoryMutationId.StormInfusion, prompt.Mutation);

        lab.Equip(LaboratoryMutationId.StormInfusion, nodes);
        Assert.IsNull(LaboratoryAdvisor.Next(lab, new DragonEssenceVault(), nodes));
    }
}
