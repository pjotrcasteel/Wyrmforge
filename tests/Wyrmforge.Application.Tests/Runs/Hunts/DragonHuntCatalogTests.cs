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
        Assert.AreEqual(4, DragonHuntCatalog.All.Select(profile => profile.Signature.Kind).Distinct().Count());
        Assert.IsTrue(DragonHuntCatalog.All.All(profile => !string.IsNullOrWhiteSpace(profile.Signature.Name)));
        Assert.IsTrue(DragonHuntCatalog.All.All(profile => !string.IsNullOrWhiteSpace(profile.PhaseTwoCallout)));
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

    [TestMethod]
    public void All_SignatureProfilesEscalateInPhaseTwo()
    {
        foreach (var profile in DragonHuntCatalog.All)
        {
            Assert.IsTrue(profile.Signature.IntervalSeconds.For(2) < profile.Signature.IntervalSeconds.For(1));
            Assert.IsTrue(profile.Signature.Damage.For(2) > profile.Signature.Damage.For(1));
            Assert.IsTrue(profile.Signature.Radius.For(2) >= profile.Signature.Radius.For(1));
            Assert.IsTrue(profile.Signature.StrikesFor(2) >= profile.Signature.StrikesFor(1));
        }
    }
}
