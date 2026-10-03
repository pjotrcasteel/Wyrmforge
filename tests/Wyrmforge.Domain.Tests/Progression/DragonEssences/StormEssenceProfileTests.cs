using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Tests.Progression.DragonEssences;

[TestClass]
public sealed class StormEssenceProfileTests
{
    [TestMethod]
    public void StormcoilChoices_ContainThreeDistinctTempestEssences()
    {
        Assert.AreEqual(3, DragonEssenceCatalog.StormcoilChoices.Count);
        Assert.AreEqual(6, DragonEssenceCatalog.All.Count);
        Assert.IsTrue(DragonEssenceCatalog.StormcoilChoices.All(choice => choice.Source == "Stormcoil"));
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
