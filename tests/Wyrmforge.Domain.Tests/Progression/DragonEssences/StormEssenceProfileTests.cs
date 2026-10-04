using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Tests.Progression.DragonEssences;

[TestClass]
public sealed class StormEssenceProfileTests
{
    [TestMethod]
    public void Catalog_FourWyrms_ContainsThreeUniqueEssencesPerWyrm()
    {
        Assert.AreEqual(12, DragonEssenceCatalog.All.Count);
        Assert.AreEqual(12, DragonEssenceCatalog.All.Select(choice => choice.Id).Distinct().Count());

        foreach (var dragon in DragonCatalog.All)
        {
            var choices = DragonEssenceCatalog.ChoicesFor(dragon.Id);
            Assert.AreEqual(3, choices.Count, $"{dragon.Name} should offer exactly three essences.");
            Assert.AreEqual(3, choices.Select(choice => choice.Id).Distinct().Count());
            Assert.IsTrue(choices.All(choice => choice.Source == dragon.Name));
        }
    }

    [TestMethod]
    public void StormcoilChoices_ContainThreeDistinctTempestEssences()
    {
        CollectionAssert.AreEqual(
            new[] { DragonEssenceId.StormHeart, DragonEssenceId.ChargedScale, DragonEssenceId.TempestWing },
            DragonEssenceCatalog.ChoicesFor(DragonId.Stormcoil).Select(choice => choice.Id).ToArray());
    }

    [TestMethod]
    public void TempestEffects_UseBoundedReadableCadences()
    {
        Assert.AreEqual(5, StormEssenceProfile.StormHeartCastInterval);
        Assert.AreEqual(6d, StormEssenceProfile.ChargedScaleCooldownSeconds);
        Assert.AreEqual(0.75d, StormEssenceProfile.TempestWingChargeSeconds);
        Assert.AreEqual(0.6d, StormEssenceProfile.TempestWingEchoDamageScale);
    }
}
