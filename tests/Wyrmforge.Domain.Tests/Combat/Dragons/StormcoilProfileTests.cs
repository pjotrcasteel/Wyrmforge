using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Domain.Tests.Combat.Dragons;

[TestClass]
public sealed class StormcoilProfileTests
{
    [TestMethod]
    public void PhaseTwo_MakesStormPulseLargerFasterAndMoreDangerous()
    {
        Assert.IsTrue(StormcoilProfile.PulseRadius(2) > StormcoilProfile.PulseRadius(1));
        Assert.IsTrue(StormcoilProfile.PulseDamage(2) > StormcoilProfile.PulseDamage(1));
        Assert.IsTrue(StormcoilProfile.TelegraphSeconds(2) < StormcoilProfile.TelegraphSeconds(1));
        Assert.IsTrue(StormcoilProfile.CooldownSeconds(2) < StormcoilProfile.CooldownSeconds(1));
    }

    [TestMethod]
    public void DragonCatalog_ContainsDistinctSecondDragon()
    {
        Assert.AreEqual(2, DragonCatalog.All.Count);
        Assert.AreEqual(DragonId.Stormcoil, DragonCatalog.Stormcoil.Id);
        Assert.AreEqual("Tempest Wyrm", DragonCatalog.Stormcoil.Title);
    }
}
