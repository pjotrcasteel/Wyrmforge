using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Offerings;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Forge;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Offerings;

[TestClass]
public sealed class RunOfferingProgressionTests
{
    [TestMethod]
    public void CanOffer_BeforeLineageDiscovery_ReturnsFalse()
    {
        var progression = new ForgeProgressionState();

        Assert.IsFalse(RunOfferingCatalog.CanOffer(DragonEssenceId.StormHeart, progression));
    }

    [TestMethod]
    public void CanOffer_AfterLineageDiscovery_ReturnsTrueForAllRecipesInLineage()
    {
        var progression = new ForgeProgressionState();
        progression.Discover(ForgeDiscoveryContext.FromEssences([DragonEssenceId.StormHeart]));

        Assert.IsTrue(RunOfferingCatalog.CanOffer(DragonEssenceId.StormHeart, progression));
        Assert.IsTrue(RunOfferingCatalog.CanOffer(DragonEssenceId.ChargedScale, progression));
        Assert.IsTrue(RunOfferingCatalog.CanOffer(DragonEssenceId.TempestWing, progression));
    }

    [TestMethod]
    public void All_EachEssence_HasAnOfferingRecipe()
    {
        CollectionAssert.AreEquivalent(Enum.GetValues<DragonEssenceId>(), RunOfferingCatalog.All.Select(offering => offering.EssenceId).ToArray());
    }

    [TestMethod]
    public void LineageRecipes_ProvideHorizontalStartingOptions()
    {
        Assert.AreEqual(SpellId.ChainLightning, RunOfferingCatalog.Get(DragonEssenceId.StormHeart).StartingSpell);
        Assert.AreEqual(SpellId.FrostShard, RunOfferingCatalog.Get(DragonEssenceId.RimeHeart).StartingSpell);
        Assert.AreEqual(RunUpgradeId.Quickening, RunOfferingCatalog.Get(DragonEssenceId.NullScale).StartingUpgrade);
    }
}
