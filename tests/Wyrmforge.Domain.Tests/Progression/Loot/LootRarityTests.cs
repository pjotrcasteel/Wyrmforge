using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Loot;
using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Domain.Tests.Progression.Loot;

[TestClass]
public sealed class LootRarityTests
{
    [TestMethod]
    [DataRow(WyrmTier.Wyrm, LootRarity.Common, LootRarity.Rare)]
    [DataRow(WyrmTier.Ascendant, LootRarity.Rare, LootRarity.Epic)]
    [DataRow(WyrmTier.Elder, LootRarity.Epic, LootRarity.Legendary)]
    public void TierCapsOrdinaryDropsAndGradesTheEssenceOneStepAbove(WyrmTier tier, LootRarity cap, LootRarity essence)
    {
        Assert.AreEqual(cap, LootRarityRules.DropCap(tier));
        Assert.AreEqual(essence, LootRarityRules.Essence(tier));
        Assert.IsTrue(LootRarityRules.CanDrop(cap, tier));
        Assert.IsFalse(LootRarityRules.CanDrop(essence, tier));
    }

    [TestMethod]
    public void HighestTiersCapAtLegendary()
    {
        foreach (var tier in Enum.GetValues<WyrmTier>().Where(tier => tier > WyrmTier.Elder))
        {
            Assert.AreEqual(LootRarity.Legendary, LootRarityRules.DropCap(tier));
            Assert.AreEqual(LootRarity.Legendary, LootRarityRules.Essence(tier));
        }
    }

    [TestMethod]
    public void EveryHuntMaterialHasAKnownRarity()
    {
        Assert.AreEqual(LootRarity.Common, HuntMaterialCatalog.Rarity(HuntMaterialId.EmberResidue));
        Assert.AreEqual(LootRarity.Common, HuntMaterialCatalog.Rarity(HuntMaterialId.CharredScrap));
        Assert.AreEqual(LootRarity.Rare, HuntMaterialCatalog.Rarity(HuntMaterialId.Emberglass));
        Assert.AreEqual(Enum.GetValues<HuntMaterialId>().Length, HuntMaterialCatalog.All.Count);
    }

    [TestMethod]
    public void EssenceVault_KeepsGradesAcrossSaveAndSpendsLowestGradeFirst()
    {
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.CinderHeart, LootRarity.Epic);
        vault.Store(DragonEssenceId.CinderHeart);
        vault.Store(DragonEssenceId.MoltenFang, LootRarity.Legendary);

        var restored = new DragonEssenceVault();
        restored.Restore(vault.SecuredEssences, vault.Grades());
        Assert.AreEqual(2, restored.Count(DragonEssenceId.CinderHeart));
        Assert.AreEqual(1, restored.Count(DragonEssenceId.CinderHeart, LootRarity.Epic));
        Assert.AreEqual(1, restored.Count(DragonEssenceId.MoltenFang, LootRarity.Legendary));

        Assert.IsTrue(restored.TryConsume(DragonEssenceId.CinderHeart, out var spent));
        Assert.AreEqual(LootRarity.Rare, spent);
        Assert.AreEqual(1, restored.Count(DragonEssenceId.CinderHeart, LootRarity.Epic));
    }

    [TestMethod]
    public void EssenceVault_LegacySaveWithoutGradesTreatsEveryEssenceAsRare()
    {
        var vault = new DragonEssenceVault();
        vault.Restore([DragonEssenceId.CinderHeart, DragonEssenceId.CinderHeart]);
        Assert.AreEqual(2, vault.Count(DragonEssenceId.CinderHeart, LootRarity.Rare));
        Assert.AreEqual(0, vault.Grades().Count);
    }
}
