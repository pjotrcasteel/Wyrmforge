using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Domain.Tests.Combat.Dragons;

[TestClass]
public sealed class DragonCombatProfileTests
{
    [TestMethod]
    public void Stormcoil_PhaseTwo_MakesStormPulseLargerFasterAndMoreDangerous()
    {
        var attack = DragonCatalog.Stormcoil.Combat.Attack;

        Assert.IsTrue(attack.Geometry.Radius.For(2) > attack.Geometry.Radius.For(1));
        Assert.IsTrue(attack.Damage.For(2) > attack.Damage.For(1));
        Assert.IsTrue(attack.TelegraphSeconds.For(2) < attack.TelegraphSeconds.For(1));
        Assert.IsTrue(attack.CooldownSeconds.For(2) < attack.CooldownSeconds.For(1));
    }

    [TestMethod]
    public void DragonCatalog_ContainsOneWyrmForEveryElementalSchool()
    {
        Assert.AreEqual(4, DragonCatalog.All.Count);
        CollectionAssert.AreEquivalent(
            new[] { DragonId.Ashfang, DragonId.Stormcoil, DragonId.Rimeclaw, DragonId.Voidweaver },
            DragonCatalog.All.Select(dragon => dragon.Id).ToArray());
    }
}
