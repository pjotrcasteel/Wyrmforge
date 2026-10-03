using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Offerings;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Offerings;

[TestClass]
public sealed class RunOfferingCatalogTests
{
    [TestMethod]
    public void All_MapsEachAshfangEssenceToOneSmallStartingBoon()
    {
        var cinderHeart = RunOfferingCatalog.Get(DragonEssenceId.CinderHeart);
        var moltenFang = RunOfferingCatalog.Get(DragonEssenceId.MoltenFang);
        var ashenWing = RunOfferingCatalog.Get(DragonEssenceId.AshenWing);

        Assert.AreEqual(SpellId.FireBolt, cinderHeart.StartingSpell);
        Assert.IsNull(cinderHeart.StartingUpgrade);
        Assert.AreEqual(RunUpgradeId.Potency, moltenFang.StartingUpgrade);
        Assert.IsNull(moltenFang.StartingSpell);
        Assert.AreEqual(RunUpgradeId.Fleetfoot, ashenWing.StartingUpgrade);
        Assert.IsNull(ashenWing.StartingSpell);
    }
}
