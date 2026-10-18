using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Tests.Combat;

[TestClass]
public sealed class PresenceScaleTests
{
    [TestMethod]
    public void EliteStandsLargerThanItsKin()
    {
        var plain = new EnemyState(1, Vector2D.Zero, 13, 30, 50, EnemyKind.MireHound);
        var elite = new EnemyState(2, Vector2D.Zero, 13, 30, 50, EnemyKind.MireHound) { Elite = EliteAffix.Thornrunner };

        Assert.AreEqual(13, plain.Radius, 1e-9);
        Assert.AreEqual(13 * EnemyState.EliteSizeScale, elite.Radius, 1e-9);
    }

    [TestMethod]
    public void UniquesOutsizeEveryOrdinaryEnemy()
    {
        var ordinary = new[] { EnemyKind.Hollow, EnemyKind.MireHound, EnemyKind.Ashling, EnemyKind.Penitent, EnemyKind.AshSlinger, EnemyKind.AshPriest, EnemyKind.DrownedWraith }
            .Max(kind => EnemyCatalog.Get(kind).Radius * EnemyState.EliteSizeScale);

        Assert.IsTrue(EnemyCatalog.Get(EnemyKind.Reliquary).Radius > ordinary);
        Assert.IsTrue(EnemyCatalog.Get(EnemyKind.BellWarden).Radius > EnemyCatalog.Get(EnemyKind.Reliquary).Radius);
    }

    [TestMethod]
    public void EveryWyrmDwarfsTheBellWarden()
    {
        var warden = EnemyCatalog.Get(EnemyKind.BellWarden).Radius;
        foreach (var definition in DragonCatalog.All)
            Assert.IsTrue(definition.Radius >= warden * 1.4, definition.Name);
    }

    [TestMethod]
    public void HigherTiersGrowStrictlyAndLeaveRoomForTheGodlike()
    {
        var tiers = Enum.GetValues<WyrmTier>().OrderBy(tier => (int)tier).Select(WyrmTierCatalog.SizeScale).ToArray();

        Assert.AreEqual(1, tiers[0], 1e-9);
        for (var index = 1; index < tiers.Length; index++)
            Assert.IsTrue(tiers[index] > tiers[index - 1]);
        Assert.IsTrue(tiers[^1] >= tiers[(int)WyrmTier.Ascendant] * 1.3, "The godlike tier must read as a different order of creature.");
    }

    [TestMethod]
    public void DragonBodyFollowsItsTier()
    {
        var definition = DragonCatalog.All.First();
        var wyrm = new DragonState(1, definition, Vector2D.Zero);
        var ascendant = new DragonState(2, definition, Vector2D.Zero, 1.35, WyrmTier.Ascendant);

        Assert.AreEqual(definition.Radius, wyrm.Radius, 1e-9);
        Assert.AreEqual(definition.Radius * WyrmTierCatalog.SizeScale(WyrmTier.Ascendant), ascendant.Radius, 1e-9);
    }
}