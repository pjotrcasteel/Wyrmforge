using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.World;

namespace Wyrmforge.Domain.Tests.World;

[TestClass]
public sealed class RegionWorldTests
{
    [TestMethod]
    [DataRow("")]
    [DataRow("Cinder Frontier")]
    [DataRow("-cinder")]
    [DataRow("cinder--frontier")]
    public void RegionIdRejectsNonKebabCase(string value) =>
        Assert.ThrowsExactly<ArgumentException>(() => new RegionId(value), value);

    [TestMethod]
    public void DiscoveryIsReportedOnlyOnceAndKeepsOrder()
    {
        var state = new RegionDiscoveryState();
        Assert.IsTrue(state.Discover(new RegionId("cinder-frontier")));
        Assert.IsFalse(state.Discover(new RegionId("cinder-frontier")));
        Assert.IsTrue(state.Discover(new RegionId("glacier-region")));
        CollectionAssert.AreEqual(new[] { "cinder-frontier", "glacier-region" }, state.Save());
    }

    [TestMethod]
    public void RestoreDropsMalformedAndDuplicateIds()
    {
        var state = new RegionDiscoveryState();
        state.Restore(["cinder-frontier", "Not Valid", "cinder-frontier", "", "glacier-region"]);
        CollectionAssert.AreEqual(new[] { "cinder-frontier", "glacier-region" }, state.Save());
        state.Restore(null);
        Assert.AreEqual(0, state.Discovered.Count);
    }

    [TestMethod]
    public void EverySchoolHasExactlyOneLineageWithOrderedTiers()
    {
        foreach (var school in Enum.GetValues<SpellSchool>())
            Assert.AreEqual(school, WyrmLineageCatalog.For(school).School);
        Assert.AreEqual(Enum.GetValues<DragonId>().Length, WyrmLineageCatalog.All.Select(lineage => lineage.Wyrm).Distinct().Count());
        foreach (var lineage in WyrmLineageCatalog.All)
        {
            var tiers = lineage.Tiers.Select(tier => tier.Tier).ToArray();
            CollectionAssert.AreEqual(tiers.OrderBy(tier => tier).ToArray(), tiers);
            Assert.IsTrue(lineage.Tiers.Any(tier => tier.Tier == WyrmTier.Primordial && tier.Availability == WyrmTierAvailability.Reserved));
            Assert.IsTrue(lineage.Tiers.Where(tier => tier.Tier <= WyrmTier.Ascendant).All(tier => tier.Availability == WyrmTierAvailability.Hunted));
        }
    }

    [TestMethod]
    public void HigherTiersAreAlwaysLarger()
    {
        var tiers = Enum.GetValues<WyrmTier>().OrderBy(tier => tier).ToArray();
        for (var index = 1; index < tiers.Length; index++)
            Assert.IsTrue(WyrmTierCatalog.SizeScale(tiers[index]) > WyrmTierCatalog.SizeScale(tiers[index - 1]), tiers[index].ToString());
    }
}
