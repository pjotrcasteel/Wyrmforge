using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Tests.Runs.Hunts;

[TestClass]
public sealed class DragonHuntCatalogTests
{
    [TestMethod]
    public void All_ContainsDistinctHuntIdentityForEveryWyrm()
    {
        Assert.AreEqual(4, DragonHuntCatalog.All.Count);
        CollectionAssert.AreEquivalent(Enum.GetValues<DragonId>(), DragonHuntCatalog.All.Select(profile => profile.Dragon).ToArray());
        Assert.AreEqual(4, DragonHuntCatalog.All.Select(profile => profile.Arena).Distinct().Count());
        Assert.AreEqual(4, DragonHuntCatalog.All.Select(profile => profile.Entrance.Style).Distinct().Count());
    }

    [TestMethod]
    public void All_PressureProfilesEscalateInPhaseTwo()
    {
        foreach (var profile in DragonHuntCatalog.All)
        {
            Assert.IsTrue(profile.Pressure.Cadence.IntervalSeconds.For(2) < profile.Pressure.Cadence.IntervalSeconds.For(1));
            Assert.IsTrue(profile.Pressure.Damage.For(2) > profile.Pressure.Damage.For(1));
            Assert.IsTrue(profile.Pressure.Radius.For(2) >= profile.Pressure.Radius.For(1));
        }
    }
}
