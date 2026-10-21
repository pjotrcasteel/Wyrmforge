using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Domain.Tests.Spells;

[TestClass]
public sealed class FireballCoreStateTests
{
    [TestMethod]
    public void NewFireball_HasOneSocketAndNoFreeMutators()
    {
        var core = new FireballCoreState();

        Assert.AreEqual(1, core.Level);
        Assert.AreEqual(5, core.Slots.Count);
        Assert.AreEqual(0, core.Equipped.Count);
        Assert.IsFalse(core.Equip(1, FireballMutationId.Detonation));
        Assert.IsFalse(core.Equip(0, FireballMutationId.Detonation));
    }

    [TestMethod]
    public void CoreUpgrade_RequiresSecuredMaterialsAndConsumesOnlyRecipe()
    {
        var core = new FireballCoreState();
        var vault = new DragonEssenceVault();

        Assert.IsFalse(core.Upgrade(vault));
        Assert.AreEqual(1, core.Level);
        vault.Store(DragonEssenceId.CinderHeart);
        vault.Store(DragonEssenceId.MoltenFang);

        Assert.IsTrue(core.Upgrade(vault));
        Assert.AreEqual(2, core.Level);
        Assert.AreEqual(0, vault.Count(DragonEssenceId.CinderHeart));
        Assert.AreEqual(1, vault.Count(DragonEssenceId.MoltenFang));
        Assert.IsTrue(core.Upgrade(vault));
        Assert.AreEqual(3, core.Level);
        Assert.AreEqual(0, vault.Count(DragonEssenceId.MoltenFang));
    }

    [TestMethod]
    public void LearnedMutation_CanEquipOnlyInUnlockedUniqueSlot()
    {
        var core = new FireballCoreState();
        Assert.IsTrue(core.DiscoverSecured([DragonEssenceId.CinderHeart]));
        Assert.IsTrue(core.Equip(0, FireballMutationId.Detonation));
        Assert.IsFalse(core.Equip(1, FireballMutationId.Detonation));
        Assert.IsFalse(core.Equip(0, FireballMutationId.MeteorHeart));

        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.CinderHeart);
        Assert.IsTrue(core.Upgrade(vault));
        Assert.IsFalse(core.Equip(1, FireballMutationId.Detonation));
        Assert.IsTrue(core.Equip(0, null));
        Assert.IsTrue(core.Equip(1, FireballMutationId.Detonation));
        Assert.AreEqual(FireballMutationId.Detonation, core.Slots[1]);
    }

    [TestMethod]
    public void SaveRestore_RejectsLockedDuplicatedAndUnresearchedItems()
    {
        var core = new FireballCoreState();
        core.Restore(new FireballCoreSave(2, [FireballMutationId.Detonation],
            [FireballMutationId.Detonation, FireballMutationId.Detonation, FireballMutationId.MeteorHeart]));

        Assert.AreEqual(2, core.Level);
        Assert.AreEqual(1, core.Equipped.Count);
        Assert.AreEqual(FireballMutationId.Detonation, core.Slots[0]);
        Assert.IsNull(core.Slots[1]);
        Assert.IsNull(core.Slots[2]);
    }

    [TestMethod]
    public void CraftCinderNeedle_MissingMaterialsNeverSpendOrUnlock()
    {
        var satchel = new HuntMaterialSatchel();
        satchel.Store(HuntMaterialId.EmberResidue);
        satchel.Store(HuntMaterialId.CharredScrap);
        var core = new FireballCoreState();

        Assert.IsFalse(core.CraftCinderNeedle(satchel));
        Assert.AreEqual(1, satchel.Count(HuntMaterialId.EmberResidue));
        Assert.AreEqual(1, satchel.Count(HuntMaterialId.CharredScrap));
        Assert.IsFalse(core.Discovered.Contains(FireballMutationId.CinderNeedle));
    }

    [TestMethod]
    public void CraftCinderNeedle_PaysExactCommonRecipeOnceAndPersistsEquippedMutation()
    {
        var satchel = new HuntMaterialSatchel();
        satchel.Restore([HuntMaterialId.EmberResidue, HuntMaterialId.EmberResidue,
            HuntMaterialId.EmberResidue, HuntMaterialId.CharredScrap, HuntMaterialId.CharredScrap]);
        var core = new FireballCoreState();

        Assert.IsTrue(core.CraftCinderNeedle(satchel));
        Assert.IsTrue(core.Equip(0, FireballMutationId.CinderNeedle));
        Assert.AreEqual(1, satchel.Count(HuntMaterialId.EmberResidue));
        Assert.AreEqual(0, satchel.Count(HuntMaterialId.CharredScrap));
        Assert.IsFalse(core.CraftCinderNeedle(satchel));

        var restored = new FireballCoreState();
        restored.Restore(core.ToSave());
        Assert.AreEqual(FireballMutationId.CinderNeedle, restored.Slots[0]);
        Assert.IsTrue(restored.Discovered.Contains(FireballMutationId.CinderNeedle));
        Assert.IsTrue(HuntMaterialCatalog.CinderNeedleRecipe.All(need => need.Required == 2));
    }

    [TestMethod]
    public void SavedCore_ClampsLevelAndDoesNotGrantMissingDiscovery()
    {
        var core = new FireballCoreState();
        core.Restore(new FireballCoreSave(999, [], [FireballMutationId.MeteorHeart]));
        Assert.AreEqual(5, core.Level);
        Assert.AreEqual(0, core.Equipped.Count);
    }
}
