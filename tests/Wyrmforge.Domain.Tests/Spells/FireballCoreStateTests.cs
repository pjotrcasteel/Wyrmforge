using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Loot;
using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Domain.Tests.Spells;

[TestClass]
public sealed class FireballCoreStateTests
{
    [TestMethod]
    public void NewFireball_HasNoOpenSocketAndNoFreeMutators()
    {
        var core = new FireballCoreState();

        Assert.AreEqual(1, core.Level);
        Assert.AreEqual(5, core.Slots.Count);
        Assert.AreEqual(0, core.SocketCapacity);
        Assert.AreEqual(0, core.Equipped.Count);
        Assert.IsFalse(core.Equip(1, FireballMutationId.Detonation));
        Assert.IsFalse(core.Equip(0, FireballMutationId.Detonation));
    }

    [DataTestMethod]
    [DataRow(1, 0)]
    [DataRow(2, 1)]
    [DataRow(3, 2)]
    [DataRow(4, 3)]
    [DataRow(5, 5)]
    public void CoreLevels_OpenFirstSocketAtLevelTwo_AndFinalTwoAtCapstone(int level, int expectedCapacity)
    {
        var core = new FireballCoreState();
        core.Restore(new FireballCoreSave(level, [], []));

        Assert.AreEqual(expectedCapacity, core.SocketCapacity);
        Assert.AreEqual(expectedCapacity, FireballCoreCatalog.SocketCapacityForLevel(level));
        for (var slot = 0; slot < 5; slot++)
        {
            var unlocked = FireballCoreCatalog.UnlockLevelForSocket(slot) <= level;
            Assert.AreEqual(slot < expectedCapacity, unlocked, $"Socket {slot + 1} unlocks at the wrong level.");
        }
    }

    [DataTestMethod]
    [DataRow(DragonEssenceId.CinderHeart)]
    [DataRow(DragonEssenceId.MoltenFang)]
    [DataRow(DragonEssenceId.AshenWing)]
    public void FirstUpgrade_AcceptsExactlyOneOfAnyAshfangEssence(DragonEssenceId firstDrop)
    {
        var core = new FireballCoreState();
        var vault = new DragonEssenceVault();
        vault.Store(firstDrop);
        Assert.IsTrue(core.DiscoverSecured([firstDrop]));

        Assert.IsTrue(core.CanUpgrade(vault, new HuntMaterialSatchel()));
        Assert.IsTrue(core.Upgrade(vault, new HuntMaterialSatchel()));
        Assert.AreEqual(2, core.Level);
        Assert.AreEqual(1, core.SocketCapacity);
        Assert.AreEqual(0, vault.TotalCount);
        Assert.AreEqual(1, core.Discovered.Count, "The first upgrade must not erase earned mutation research.");
        Assert.IsFalse(core.Upgrade(vault, new HuntMaterialSatchel()));
    }

    [TestMethod]
    public void FirstUpgrade_IgnoresOtherWyrmsAndSpendsLowestGradeAshfangCopy()
    {
        var core = new FireballCoreState();
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.RimeHeart);
        Assert.IsFalse(core.CanUpgrade(vault, new HuntMaterialSatchel()));

        vault.Store(DragonEssenceId.CinderHeart, LootRarity.Epic);
        vault.Store(DragonEssenceId.AshenWing, LootRarity.Rare);
        Assert.AreEqual(DragonEssenceId.AshenWing, FireballCoreCatalog.FirstUpgradeEssenceChoice(vault));
        Assert.IsTrue(core.Upgrade(vault, new HuntMaterialSatchel()));
        Assert.AreEqual(1, vault.Count(DragonEssenceId.CinderHeart, LootRarity.Epic));
        Assert.AreEqual(0, vault.Count(DragonEssenceId.AshenWing));
        Assert.AreEqual(1, vault.Count(DragonEssenceId.RimeHeart));
    }

    [TestMethod]
    public void CoreUpgrade_RequiresSecuredMaterialsAndConsumesOnlyRecipe()
    {
        var core = new FireballCoreState();
        var vault = new DragonEssenceVault();

        Assert.IsFalse(core.Upgrade(vault, new HuntMaterialSatchel()));
        Assert.AreEqual(1, core.Level);
        vault.Store(DragonEssenceId.CinderHeart);
        vault.Store(DragonEssenceId.MoltenFang);

        Assert.IsTrue(core.Upgrade(vault, new HuntMaterialSatchel()));
        Assert.AreEqual(2, core.Level);
        Assert.AreEqual(0, vault.Count(DragonEssenceId.CinderHeart));
        Assert.AreEqual(1, vault.Count(DragonEssenceId.MoltenFang));
        Assert.IsFalse(core.Upgrade(vault, new HuntMaterialSatchel()), "The second upgrade must need two Essences and common salvage.");
        vault.Store(DragonEssenceId.AshenWing);
        var materials = new HuntMaterialSatchel();
        materials.Restore([HuntMaterialId.EmberResidue, HuntMaterialId.EmberResidue, HuntMaterialId.CharredScrap, HuntMaterialId.CharredScrap]);
        Assert.IsTrue(core.Upgrade(vault, materials));
        Assert.AreEqual(3, core.Level);
        Assert.AreEqual(0, vault.Count(DragonEssenceId.MoltenFang));
        Assert.AreEqual(0, materials.Items.Count);
    }

    [TestMethod]
    public void LearnedMutation_CanEquipOnlyInUnlockedUniqueSlot()
    {
        var core = new FireballCoreState();
        Assert.IsTrue(core.DiscoverSecured([DragonEssenceId.CinderHeart]));
        Assert.IsFalse(core.Equip(0, FireballMutationId.Detonation), "Knowing a mutation must not bypass the first core upgrade.");
        Assert.IsFalse(core.Equip(1, FireballMutationId.Detonation));
        Assert.IsFalse(core.Equip(0, FireballMutationId.MeteorHeart));

        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.CinderHeart);
        Assert.IsTrue(core.Upgrade(vault, new HuntMaterialSatchel()));
        Assert.IsTrue(core.Equip(0, FireballMutationId.Detonation));
        Assert.IsFalse(core.Equip(1, FireballMutationId.Detonation));
        Assert.IsTrue(core.Equip(0, null));
        Assert.IsFalse(core.Equip(1, FireballMutationId.Detonation));
        vault.Store(DragonEssenceId.MoltenFang);
        vault.Store(DragonEssenceId.AshenWing);
        var materials = new HuntMaterialSatchel();
        materials.Restore([HuntMaterialId.EmberResidue, HuntMaterialId.EmberResidue, HuntMaterialId.CharredScrap, HuntMaterialId.CharredScrap]);
        Assert.IsTrue(core.Upgrade(vault, materials));
        Assert.IsTrue(core.Equip(1, FireballMutationId.Detonation));
        Assert.AreEqual(FireballMutationId.Detonation, core.Slots[1]);
    }

    [TestMethod]
    public void LegacySave_PreservesFormerlyEquippedMutatorWithoutActivatingAtLevelOne()
    {
        var core = new FireballCoreState();
        core.Restore(new FireballCoreSave(1, [FireballMutationId.Detonation], [FireballMutationId.Detonation]));
        Assert.AreEqual(0, core.SocketCapacity);
        Assert.AreEqual(0, core.Equipped.Count);
        Assert.AreEqual(FireballMutationId.Detonation, core.ToSave().Slots![0], "Previously earned choices must not be deleted.");

        var restored = new FireballCoreState();
        restored.Restore(core.ToSave());
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.AshenWing);
        Assert.IsTrue(restored.Upgrade(vault, new HuntMaterialSatchel()));
        CollectionAssert.AreEqual(new[] { FireballMutationId.Detonation }, restored.Equipped.ToArray());
    }

    [TestMethod]
    public void LegacyLevelTwoSave_KeepsSecondSocketSealedUntilLevelThree()
    {
        var core = new FireballCoreState();
        core.Restore(new FireballCoreSave(2, [FireballMutationId.Detonation, FireballMutationId.MeteorHeart],
            [FireballMutationId.Detonation, FireballMutationId.MeteorHeart]));
        CollectionAssert.AreEqual(new[] { FireballMutationId.Detonation }, core.Equipped.ToArray());
        Assert.AreEqual(FireballMutationId.MeteorHeart, core.ToSave().Slots![1]);

        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.MoltenFang);
        vault.Store(DragonEssenceId.AshenWing);
        var materials = new HuntMaterialSatchel();
        materials.Restore([HuntMaterialId.EmberResidue, HuntMaterialId.EmberResidue, HuntMaterialId.CharredScrap, HuntMaterialId.CharredScrap]);
        Assert.IsTrue(core.Upgrade(vault, materials));
        CollectionAssert.AreEqual(new[] { FireballMutationId.Detonation, FireballMutationId.MeteorHeart }, core.Equipped.ToArray());
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
        Assert.IsFalse(core.Equip(0, FireballMutationId.CinderNeedle));
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.CinderHeart);
        Assert.IsTrue(core.Upgrade(vault, new HuntMaterialSatchel()));
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

    [TestMethod]
    public void HighCoreLevels_RequireIncreasingEssencesAndTierSpecificSalvage()
    {
        var core = new FireballCoreState();
        core.Restore(new FireballCoreSave(3, [], []));
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.CinderHeart, LootRarity.Epic);
        vault.Store(DragonEssenceId.AshenWing);
        vault.Store(DragonEssenceId.MoltenFang);
        var satchel = new HuntMaterialSatchel();

        Assert.AreEqual(LootRarity.Rare, HuntMaterialCatalog.Rarity(HuntMaterialId.Emberglass));
        Assert.IsFalse(core.CanUpgrade(vault, satchel));
        Assert.IsFalse(core.Upgrade(vault, satchel));
        Assert.AreEqual(3, core.Level);
        Assert.AreEqual(1, vault.Count(DragonEssenceId.CinderHeart, LootRarity.Epic), "Graded Essence is never lost to a failed upgrade.");
        Assert.AreEqual(1, vault.Count(DragonEssenceId.AshenWing));

        satchel.Restore([HuntMaterialId.Emberglass, HuntMaterialId.EmberResidue, HuntMaterialId.EmberResidue, HuntMaterialId.EmberResidue]);
        Assert.IsTrue(core.Upgrade(vault, satchel));
        Assert.AreEqual(4, core.Level);
        Assert.AreEqual(0, satchel.Count(HuntMaterialId.Emberglass));
        Assert.AreEqual(0, vault.Count(DragonEssenceId.CinderHeart));
        CollectionAssert.AreEqual(new[] { new HuntMaterialNeed(HuntMaterialId.Emberglass, 2), new HuntMaterialNeed(HuntMaterialId.Wyrmcinder, 1),
            new HuntMaterialNeed(HuntMaterialId.CharredScrap, 4) },
            FireballCoreCatalog.UpgradeMaterialsTo(5).ToArray(), "The last core level needs Epic Tier-III Wyrmcinder.");
        Assert.IsTrue(FireballCoreCatalog.UpgradeMaterialsTo(3).All(need => HuntMaterialCatalog.Rarity(need.Material) == LootRarity.Common),
            "The early second paid upgrade must be achievable entirely in Tier I.");

        vault.Store(DragonEssenceId.CinderHeart);
        vault.Store(DragonEssenceId.MoltenFang);
        vault.Store(DragonEssenceId.AshenWing);
        satchel.Store(HuntMaterialId.Emberglass);
        Assert.IsFalse(core.Upgrade(vault, satchel), "Three Essences and Rare Emberglass do not buy the capstone.");
        vault.Store(DragonEssenceId.MoltenFang);
        satchel.Restore([HuntMaterialId.Emberglass, HuntMaterialId.Emberglass, HuntMaterialId.Wyrmcinder,
            HuntMaterialId.CharredScrap, HuntMaterialId.CharredScrap, HuntMaterialId.CharredScrap, HuntMaterialId.CharredScrap]);
        Assert.IsTrue(core.Upgrade(vault, satchel));
        Assert.AreEqual(5, core.Level);
        Assert.AreEqual(0, satchel.Count(HuntMaterialId.Wyrmcinder));
    }
}
