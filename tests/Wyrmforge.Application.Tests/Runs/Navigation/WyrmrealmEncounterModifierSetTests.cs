using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WyrmrealmEncounterModifierSetTests
{
    [TestMethod]
    public void Aggregate_MultipleModifiers_ComposesNumericEffects()
    {
        WyrmrealmEncounterModifier[] modifiers =
        [
            new("first", SpawnIntervalMultiplier: 0.8, EnemyHealthMultiplier: 1.2, EnemySpeedMultiplier: 1.1, ThreatBudgetMultiplier: 1.25, RecoveryMultiplier: 0.5),
            new("second", SpawnIntervalMultiplier: 0.9, EnemyHealthMultiplier: 1.1, EnemySpeedMultiplier: 1.05, ThreatBudgetMultiplier: 1.2),
        ];

        var result = WyrmrealmEncounterModifierSet.Aggregate(modifiers);

        Assert.AreEqual(0.72d, result.SpawnIntervalMultiplier, 0.0001);
        Assert.AreEqual(1.32d, result.EnemyHealthMultiplier, 0.0001);
        Assert.AreEqual(1.155d, result.EnemySpeedMultiplier, 0.0001);
        Assert.AreEqual(1.5d, result.ThreatBudgetMultiplier, 0.0001);
        Assert.AreEqual(0.5d, result.RecoveryMultiplier, 0.0001);
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
    public void Empty_HasNeutralEffectsAndNoHazards()
    {
        var result = WyrmrealmEncounterModifierSet.Empty;

        Assert.AreEqual(1d, result.SpawnIntervalMultiplier, 0.0001);
        Assert.AreEqual(1d, result.EnemyHealthMultiplier, 0.0001);
        Assert.AreEqual(1d, result.EnemySpeedMultiplier, 0.0001);
        Assert.AreEqual(1d, result.ThreatBudgetMultiplier, 0.0001);
        Assert.AreEqual(1d, result.RecoveryMultiplier, 0.0001);
        Assert.IsFalse(result.TryGetHazardInterval(WyrmrealmHazardKind.UnstableRifts, out _));
    }
}
