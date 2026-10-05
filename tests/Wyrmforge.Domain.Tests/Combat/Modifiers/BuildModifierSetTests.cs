using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Progression.RunUpgrades;

namespace Wyrmforge.Domain.Tests.Combat.Modifiers;

[TestClass]
public sealed class BuildModifierSetTests
{
    [TestMethod]
    public void Apply_MixedDamageSources_ComposesPercentAndMultipliers()
    {
        var modifiers = BuildModifierSet.Aggregate(
        [
            RunUpgradeCatalog.Get(RunUpgradeId.Potency).ProfileForRank(2),
            RelicCatalog.Get(RelicId.EmberheartCharm).Modifiers,
            DragonEssenceCatalog.Get(DragonEssenceId.VoidHeart).Modifiers,
        ]);

        var damage = modifiers.Apply(BuildStatId.Damage, 100);

        Assert.AreEqual(192.576d, damage, 0.0001);
    }

    [TestMethod]
    public void Apply_MaxHealthSources_ComposeFlatBonuses()
    {
        var modifiers = BuildModifierSet.Aggregate(
        [
            RunUpgradeCatalog.Get(RunUpgradeId.Vitality).ProfileForRank(2),
            RelicCatalog.Get(RelicId.Vitalstone).Modifiers,
            DragonEssenceCatalog.Get(DragonEssenceId.RimeHeart).Modifiers,
        ]);

        var maxHealth = modifiers.Apply(BuildStatId.MaxHealth, 100);

        Assert.AreEqual(202d, maxHealth, 0.0001);
    }

    [TestMethod]
    public void ApplyInt_ExtraProjectiles_PreservesMulticastRanks()
    {
        var rankOne = BuildModifierSet.Aggregate([RunUpgradeCatalog.Get(RunUpgradeId.Multicast).ProfileForRank(1)]);
        var rankTwo = BuildModifierSet.Aggregate([RunUpgradeCatalog.Get(RunUpgradeId.Multicast).ProfileForRank(2)]);

        Assert.AreEqual(1, rankOne.ApplyInt(BuildStatId.ExtraProjectiles));
        Assert.AreEqual(2, rankTwo.ApplyInt(BuildStatId.ExtraProjectiles));
        Assert.AreEqual(0.9d, rankOne.Apply(BuildStatId.Damage, 1), 0.0001);
        Assert.AreEqual(0.81d, rankTwo.Apply(BuildStatId.Damage, 1), 0.0001);
    }

    [TestMethod]
    public void Apply_StaticEssenceModifiers_PreserveExistingValues()
    {
        var modifiers = BuildModifierSet.Aggregate(
        [
            DragonEssenceCatalog.Get(DragonEssenceId.GlacialScale).Modifiers,
            DragonEssenceCatalog.Get(DragonEssenceId.HoarfrostWing).Modifiers,
            DragonEssenceCatalog.Get(DragonEssenceId.NullScale).Modifiers,
        ]);

        Assert.AreEqual(84d, modifiers.Apply(BuildStatId.DamageTaken, 100), 0.0001);
        Assert.AreEqual(114d, modifiers.Apply(BuildStatId.MoveSpeed, 100), 0.0001);
        Assert.AreEqual(0.84d, modifiers.Apply(BuildStatId.CastInterval, 1), 0.0001);
    }
}
