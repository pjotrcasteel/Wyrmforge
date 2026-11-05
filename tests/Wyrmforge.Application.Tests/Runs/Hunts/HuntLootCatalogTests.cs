using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.World;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.Loot;
using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Application.Tests.Runs.Hunts;

[TestClass]
public sealed class HuntLootCatalogTests
{
    [TestMethod]
    public void AuthoredFireTiers_HaveDistinctSourceTablesWithCorrectRarityAndEssences()
    {
        var tables = new[] { HuntLootCatalog.FireTierOne, HuntLootCatalog.FireTierTwo, HuntLootCatalog.FireTierThree };
        CollectionAssert.AreEqual(new[] { 5, 7, 8 }, tables.Select(table => table.Rules.Count).ToArray());
        CollectionAssert.AreEqual(new[] { LootRarity.Rare, LootRarity.Epic, LootRarity.Legendary },
            tables.Select(table => table.BossEssenceRarity).ToArray());

        foreach (var table in tables)
        {
            Assert.AreEqual(HuntLootTable.CurrentVersion, table.Version);
            Assert.AreSame(table, HuntLootCatalog.For(table.Hunt));
            Assert.AreEqual(3, table.BossEssenceChoices.Count);
            Assert.IsTrue(table.Rules.All(rule => table.CanDrop(rule.Material)));
            Assert.AreEqual(table.Rules.Count, table.Rules.Select(rule => (rule.Source, rule.Material)).Distinct().Count());
        }

        Assert.IsFalse(HuntLootCatalog.FireTierOne.CanDrop(LootRarity.Rare));
        Assert.IsFalse(HuntLootCatalog.FireTierTwo.CanDrop(LootRarity.Epic));
        Assert.IsTrue(HuntLootCatalog.FireTierThree.CanDrop(LootRarity.Epic));
    }

    [TestMethod]
    public void OrdinaryEnemyAndPropDrops_PreserveCurrentSourceAndStableIdRulesAcrossTiers()
    {
        foreach (var table in new[] { HuntLootCatalog.FireTierOne, HuntLootCatalog.FireTierTwo, HuntLootCatalog.FireTierThree })
        {
            foreach (var source in new[] { HuntLootSource.Ashling, HuntLootSource.AshSlinger })
            {
                for (var enemyId = 1; enemyId <= 300; enemyId++)
                {
                    var drops = table.MaterialsFor(source, enemyId);
                    CollectionAssert.AreEqual(enemyId % 3 == 0 ? new[] { HuntMaterialId.EmberResidue } : Array.Empty<HuntMaterialId>(), drops.ToArray());
                    CollectionAssert.AreEqual(drops.ToArray(), table.MaterialsFor(source, enemyId).ToArray());
                }
            }

            CollectionAssert.AreEqual(new[] { HuntMaterialId.CharredScrap }, table.MaterialsFor(HuntLootSource.Barrel).ToArray());
            CollectionAssert.AreEqual(new[] { HuntMaterialId.CharredScrap }, table.MaterialsFor(HuntLootSource.Crate).ToArray());
        }
    }

    [TestMethod]
    public void ElitesAndRefuges_GiveOnlyTheMaterialsAuthoredForTheirTier()
    {
        CollectionAssert.AreEqual(Array.Empty<HuntMaterialId>(), HuntLootCatalog.FireTierOne.MaterialsFor(HuntLootSource.EliteEnemy).ToArray());
        CollectionAssert.AreEqual(Array.Empty<HuntMaterialId>(), HuntLootCatalog.FireTierOne.MaterialsFor(HuntLootSource.ReclaimedRefuge).ToArray());
        CollectionAssert.AreEqual(new[] { HuntMaterialId.Emberglass },
            HuntLootCatalog.FireTierTwo.MaterialsFor(HuntLootSource.EliteEnemy).ToArray());
        CollectionAssert.AreEqual(new[] { HuntMaterialId.Emberglass },
            HuntLootCatalog.FireTierTwo.MaterialsFor(HuntLootSource.ReclaimedRefuge).ToArray());
        CollectionAssert.AreEqual(new[] { HuntMaterialId.Emberglass, HuntMaterialId.Wyrmcinder },
            HuntLootCatalog.FireTierThree.MaterialsFor(HuntLootSource.EliteEnemy).ToArray());
        CollectionAssert.AreEqual(new[] { HuntMaterialId.Emberglass },
            HuntLootCatalog.FireTierThree.MaterialsFor(HuntLootSource.ReclaimedRefuge).ToArray());

        // Legacy/untiered runs cannot inherit higher-tier drops merely because the enemy is elite.
        Assert.AreSame(HuntLootCatalog.FireTierOne, HuntLootCatalog.For(null));
        CollectionAssert.AreEqual(Array.Empty<HuntMaterialId>(), HuntLootCatalog.For(null).MaterialsFor(HuntLootSource.EliteEnemy).ToArray());
    }

    [TestMethod]
    public void OptionalCaches_KeepOriginalFortyThreePercentSeedRollWithoutTouchingCombatRandomness()
    {
        foreach (var table in new[] { HuntLootCatalog.FireTierOne, HuntLootCatalog.FireTierTwo, HuntLootCatalog.FireTierThree })
        {
            CollectionAssert.AreEqual(new[] { HuntMaterialId.CharredScrap },
                table.MaterialsFor(HuntLootSource.OptionalCache, siteRoll: .42).ToArray());
            CollectionAssert.AreEqual(Array.Empty<HuntMaterialId>(), table.MaterialsFor(HuntLootSource.OptionalCache, siteRoll: .43).ToArray());
            CollectionAssert.AreEqual(Array.Empty<HuntMaterialId>(), table.MaterialsFor(HuntLootSource.OptionalCache, siteRoll: .99).ToArray());
            CollectionAssert.AreEqual(Array.Empty<HuntMaterialId>(), table.MaterialsFor(HuntLootSource.OptionalCache).ToArray());
            CollectionAssert.AreEqual(Array.Empty<HuntMaterialId>(), table.MaterialsFor(HuntLootSource.OptionalCache, siteRoll: -1).ToArray());
        }
    }

    [TestMethod]
    public void UnauthoredHuntTiers_HaveNoExecutableTablesOrLegendaryItems()
    {
        var fire = RegionCatalog.CinderFrontierId;
        Assert.Throws<ArgumentException>(() => HuntLootCatalog.For(new HuntSelection(fire, WyrmTier.Primordial)));
        Assert.Throws<ArgumentException>(() => HuntLootCatalog.For(new HuntSelection(fire, WyrmTier.Divine)));
        Assert.IsFalse(HuntLootCatalog.FireTierThree.Rules.Any(rule => HuntMaterialCatalog.Rarity(rule.Material) == LootRarity.Legendary));
    }
}
