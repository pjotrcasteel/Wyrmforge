using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Loot;
using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Domain.Tests.Spells;

[TestClass]
public sealed class FireballCoreStateTests
{
    [TestMethod]
    public void NewFireball_HasNoSocketsAndNoFreeMutators()
    {
        var core = new FireballCoreState();

        Assert.AreEqual(1, core.Level);
        Assert.AreEqual(0, core.SocketCapacity);
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

        Assert.IsFalse(core.Upgrade(vault, new HuntMaterialSatchel()));
        Assert.AreEqual(1, core.Level);
        vault.Store(DragonEssenceId.CinderHeart);
        vault.Store(DragonEssenceId.MoltenFang);

        Assert.IsTrue(core.Upgrade(vault, new HuntMaterialSatchel()));
        Assert.AreEqual(2, core.Level);
        Assert.AreEqual(0, vault.Count(DragonEssenceId.CinderHeart));
        Assert.AreEqual(1, vault.Count(DragonEssenceId.MoltenFang));
        Assert.IsTrue(core.Upgrade(vault, new HuntMaterialSatchel()));
        Assert.AreEqual(3, core.Level);
        Assert.AreEqual(0, vault.Count(DragonEssenceId.MoltenFang));
    }

    [TestMethod]
    public void LearnedMutation_FirstPermanentUpgradeUnlocksFirstSocket()
    {
        var core = new FireballCoreState();
        core.DiscoverSecured([DragonEssenceId.CinderHeart]);
        Assert.IsFalse(core.Equip(0, FireballMutationId.Detonation));
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.CinderHeart);
        Assert.IsTrue(core.Upgrade(vault, new HuntMaterialSatchel()));
        Assert.AreEqual(1, core.SocketCapacity);
        Assert.IsTrue(core.Equip(0, FireballMutationId.Detonation));
        Assert.IsFalse(core.Equip(1, FireballMutationId.Detonation));
        vault.Store(DragonEssenceId.MoltenFang);
        Assert.IsTrue(core.Upgrade(vault, new HuntMaterialSatchel()));
        Assert.IsFalse(core.Equip(1, FireballMutationId.Detonation));
        Assert.IsTrue(core.Equip(0, null));
        Assert.IsTrue(core.Equip(1, FireballMutationId.Detonation));
    }

    [TestMethod]
    public void LegacyLevelOneSocket_IsPreservedDormantUntilUpgraded()
    {
        var core = new FireballCoreState();
        core.Restore(new(1, [FireballMutationId.Detonation], [FireballMutationId.Detonation]));
        var restored = new FireballCoreState();
        restored.Restore(core.ToSave());
        Assert.AreEqual(FireballMutationId.Detonation, restored.Slots[0]);
        Assert.AreEqual(0, restored.Equipped.Count);
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.CinderHeart);
        Assert.IsTrue(restored.Upgrade(vault, new HuntMaterialSatchel()));
        CollectionAssert.AreEqual(new[] { FireballMutationId.Detonation }, restored.Equipped.ToArray());
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
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.CinderHeart);
        Assert.IsTrue(core.Upgrade(vault, satchel));
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
    public void HighCoreLevels_RequireRareEmberglassAndRefundEssencesWhenMissing()
    {
        var core = new FireballCoreState();
        core.Restore(new FireballCoreSave(3, [], []));
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.CinderHeart, LootRarity.Epic);
        vault.Store(DragonEssenceId.AshenWing);
        var satchel = new HuntMaterialSatchel();

        Assert.AreEqual(LootRarity.Rare, HuntMaterialCatalog.Rarity(HuntMaterialId.Emberglass));
        Assert.IsFalse(core.CanUpgrade(vault, satchel));
        Assert.IsFalse(core.Upgrade(vault, satchel));
        Assert.AreEqual(3, core.Level);
        Assert.AreEqual(1, vault.Count(DragonEssenceId.CinderHeart, LootRarity.Epic), "Graded Essence is never lost to a failed upgrade.");
        Assert.AreEqual(1, vault.Count(DragonEssenceId.AshenWing));

        satchel.Store(HuntMaterialId.Emberglass);
        Assert.IsTrue(core.Upgrade(vault, satchel));
        Assert.AreEqual(4, core.Level);
        Assert.AreEqual(0, satchel.Count(HuntMaterialId.Emberglass));
        Assert.AreEqual(0, vault.Count(DragonEssenceId.CinderHeart));
        CollectionAssert.AreEqual(new[] { new HuntMaterialNeed(HuntMaterialId.Emberglass, 1), new HuntMaterialNeed(HuntMaterialId.Wyrmcinder, 1) },
            FireballCoreCatalog.UpgradeMaterialsTo(5).ToArray(), "The last core level needs Epic Tier-III Wyrmcinder.");
        Assert.AreEqual(0, FireballCoreCatalog.UpgradeMaterialsTo(3).Count, "Early levels stay Common-only.");

        vault.Store(DragonEssenceId.CinderHeart);
        vault.Store(DragonEssenceId.MoltenFang);
        vault.Store(DragonEssenceId.AshenWing);
        satchel.Store(HuntMaterialId.Emberglass);
        Assert.IsFalse(core.Upgrade(vault, satchel), "Rare Emberglass alone no longer reaches the last core level.");
        satchel.Store(HuntMaterialId.Wyrmcinder);
        Assert.IsTrue(core.Upgrade(vault, satchel));
        Assert.AreEqual(5, core.Level);
        Assert.AreEqual(0, satchel.Count(HuntMaterialId.Wyrmcinder));
    }
}