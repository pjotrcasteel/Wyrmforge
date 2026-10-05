using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WyrmrealmEncounterModifierSetTests
{
    [TestMethod]
    public void Aggregate_MultipleModifiers_ComposesNumericEffects()
    {
        WyrmrealmEncounterModifier[] modifiers =
        [
            new("first", SpawnIntervalMultiplier: 0.8, EnemyHealthMultiplier: 1.2, EnemySpeedMultiplier: 1.1, ThreatBudgetMultiplier: 1.25,
                RecoveryMultiplier: 0.5, PlayerMoveSpeedMultiplier: 0.9, DamageTakenMultiplier: 1.1),
            new("second", SpawnIntervalMultiplier: 0.9, EnemyHealthMultiplier: 1.1, EnemySpeedMultiplier: 1.05, ThreatBudgetMultiplier: 1.2,
                PlayerMoveSpeedMultiplier: 0.95, DamageTakenMultiplier: 1.05),
        ];

        var result = WyrmrealmEncounterModifierSet.Aggregate(modifiers);

        Assert.AreEqual(0.72d, result.SpawnIntervalMultiplier, 0.0001);
        Assert.AreEqual(1.32d, result.EnemyHealthMultiplier, 0.0001);
        Assert.AreEqual(1.155d, result.EnemySpeedMultiplier, 0.0001);
        Assert.AreEqual(1.5d, result.ThreatBudgetMultiplier, 0.0001);
        Assert.AreEqual(0.5d, result.RecoveryMultiplier, 0.0001);
        Assert.AreEqual(0.855d, result.PlayerMoveSpeedMultiplier, 0.0001);
        Assert.AreEqual(1.155d, result.DamageTakenMultiplier, 0.0001);
    }

    [TestMethod]
    public void Aggregate_SameHazard_ComposesIntervalMultiplier()
    {
        WyrmrealmEncounterModifier[] modifiers =
        [
            new("first", HazardKind: WyrmrealmHazardKind.UnstableRifts, HazardIntervalMultiplier: 0.8),
            new("second", HazardKind: WyrmrealmHazardKind.UnstableRifts, HazardIntervalMultiplier: 0.75),
        ];

        var result = WyrmrealmEncounterModifierSet.Aggregate(modifiers);

        Assert.IsTrue(result.TryGetHazardInterval(WyrmrealmHazardKind.UnstableRifts, out var interval));
        Assert.AreEqual(0.6d, interval, 0.0001);
    }

    [TestMethod]
    public void RouteProfile_EncounterModifiers_AreAvailableThroughModifierSet()
    {
        var route = new WyrmrealmRouteProfile(
            new WyrmrealmEncounterProfile(WyrmrealmEncounterKind.Mixed),
            new WyrmrealmRewardProfile(SpellSchool.Arcane),
            [new("unstable-rifts", HazardKind: WyrmrealmHazardKind.UnstableRifts, HazardIntervalMultiplier: 0.7)]);

        Assert.IsTrue(route.ModifierSet.TryGetHazardInterval(WyrmrealmHazardKind.UnstableRifts, out var interval));
        Assert.AreEqual(0.7d, interval, 0.0001);
    }

    [TestMethod]
    public void Empty_HasNeutralEffectsAndNoHazards()
    {
        var result = WyrmrealmEncounterModifierSet.Empty;

        Assert.AreEqual(1d, result.SpawnIntervalMultiplier, 0.0001);
        Assert.AreEqual(1d, result.EnemyHealthMultiplier, 0.0001);
        Assert.AreEqual(1d, result.EnemySpeedMultiplier, 0.0001);
        Assert.AreEqual(1d, result.ThreatBudgetMultiplier, 0.0001);
        Assert.AreEqual(1d, result.RecoveryMultiplier, 0.0001);
        Assert.AreEqual(1d, result.PlayerMoveSpeedMultiplier, 0.0001);
        Assert.AreEqual(1d, result.DamageTakenMultiplier, 0.0001);
        Assert.IsFalse(result.TryGetHazardInterval(WyrmrealmHazardKind.UnstableRifts, out _));
    }
}
