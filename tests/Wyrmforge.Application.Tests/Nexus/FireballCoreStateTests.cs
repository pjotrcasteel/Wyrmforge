using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Fireball;

namespace Wyrmforge.Application.Tests.Nexus;

[TestClass]
public sealed class FireballCoreStateTests
{
    [TestMethod]
    public void Upgrade_WithSecuredMaterials_UnsealsExactlyOneSlotAndConsumesRealEssence()
    {
        var core = new FireballCoreState();
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.CinderHeart);

        Assert.IsTrue(core.Upgrade(vault));
        Assert.AreEqual(2, core.Level);
        Assert.AreEqual(0, vault.Count(DragonEssenceId.CinderHeart));
        Assert.AreEqual(5, core.Slots.Count);
        Assert.IsFalse(core.Upgrade(vault));
        Assert.AreEqual(2, core.Level);
    }

    [TestMethod]
    public void Upgrade_WhenOneMaterialMissing_DoesNotConsumeAnything()
    {
        var core = new FireballCoreState();
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.CinderHeart);
        Assert.IsTrue(core.Upgrade(vault));
        vault.Store(DragonEssenceId.MoltenFang);
        Assert.IsTrue(core.Upgrade(vault));
        vault.Store(DragonEssenceId.CinderHeart);

        Assert.IsFalse(core.Upgrade(vault));
        Assert.AreEqual(3, core.Level);
        Assert.AreEqual(1, vault.Count(DragonEssenceId.CinderHeart));
    }

    [TestMethod]
    public void Slot_WithLockedOrDuplicatedMutation_IsRejected()
    {
        var core = new FireballCoreState();
        var vault = new DragonEssenceVault();

        Assert.IsFalse(core.Slot(0, FireballMutatorId.MeteorHeart));
        Assert.IsFalse(core.Slot(1, null));
        vault.Store(DragonEssenceId.MoltenFang);
        Assert.IsTrue(core.Study(FireballMutatorId.MeteorHeart, vault));
        Assert.IsTrue(core.Slot(0, FireballMutatorId.MeteorHeart));
        Assert.IsFalse(core.Slot(1, FireballMutatorId.MeteorHeart));
    }

    [TestMethod]
    public void Restore_WithMoreSlotsThanLevel_RejectsTamperedSlots()
    {
        var core = new FireballCoreState();
        core.Restore(new FireballCoreSave(1, [FireballMutatorId.MeteorHeart],
            [null, FireballMutatorId.MeteorHeart, null, null, null]));

        Assert.AreEqual(1, core.Level);
        Assert.IsFalse(core.Equipped.Contains(FireballMutatorId.MeteorHeart));
    }

    [TestMethod]
    public void Slot_WithTwoExclusiveForms_IsRejected()
    {
        var core = new FireballCoreState();
        core.Restore(new FireballCoreSave(2,
            [FireballMutatorId.MeteorHeart, FireballMutatorId.PhoenixVolley],
            [FireballMutatorId.MeteorHeart, null, null, null, null]));

        Assert.IsFalse(core.Slot(1, FireballMutatorId.PhoenixVolley));
        Assert.AreEqual(1, core.Equipped.Count);
    }

    [TestMethod]
    public void SaveAndRestore_KeepsLearnedAndEquippedMutations()
    {
        var saved = new FireballCoreSave(3,
            [FireballMutatorId.CinderNeedle, FireballMutatorId.Detonation],
            [FireballMutatorId.CinderNeedle, FireballMutatorId.Detonation, null, null, null]);
        var core = new FireballCoreState();
        core.Restore(saved);
        var copy = new FireballCoreState();
        copy.Restore(core.ToSave());

        Assert.AreEqual(3, copy.Level);
        CollectionAssert.AreEquivalent(saved.Learned, copy.Learned.ToArray());
        CollectionAssert.AreEquivalent(core.Equipped.ToArray(), copy.Equipped.ToArray());
    }
}
