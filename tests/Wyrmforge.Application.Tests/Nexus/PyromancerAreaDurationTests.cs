using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Application.Tests.Nexus;

[TestClass]
public sealed class PyromancerAreaDurationTests
{
    [TestMethod]
    public void BurningGround_ConflagrationAreaAndImmolationDuration_ChangeRealCombatBounds()
    {
        var modifiers = BuildModifierSet.Aggregate(new[]
        {
            PassiveTreeCatalog.Get("fire-ember-drift").Modifiers,
            PassiveTreeCatalog.Get("fire-scorching-winds").Modifiers,
            PassiveTreeCatalog.Get("fire-conflagration").Modifiers,
            PassiveTreeCatalog.Get("fire-ashfront").Modifiers,
            PassiveTreeCatalog.Get("fire-immolation").Modifiers,
        });

        var radiusMultiplier = modifiers.Apply(BuildStatId.MutationRadius, 1);
        var durationMultiplier = modifiers.Apply(BuildStatId.MutationDuration, 1);
        var ground = new BurningGroundState(new Vector2D(100, 100), 12, durationMultiplier, radiusMultiplier);

        Assert.IsTrue(ground.EffectiveRadius > BurningGroundState.Radius);
        Assert.IsTrue(ground.RemainingSeconds > BurningGroundState.DurationSeconds);
        Assert.AreEqual(12, ground.DamagePerTick, 0.00001, "Area and duration passives must never grant accidental damage.");
    }

    [TestMethod]
    public void BurningGround_ExcessiveAmplifiers_CannotEscapeDurationOrRadiusLimits()
    {
        var ground = new BurningGroundState(new Vector2D(0, 0), 1, 50, 50);

        Assert.AreEqual(BurningGroundState.Radius * 2, ground.EffectiveRadius, 0.00001);
        Assert.AreEqual(BurningGroundState.DurationSeconds * 2, ground.RemainingSeconds, 0.00001);
    }

    [TestMethod]
    public void DetonationWebArea_PermanentlyIncreasesItsActualExplosionRadius()
    {
        var modifiers = BuildModifierSet.Aggregate(new[]
        {
            PassiveTreeCatalog.Get("fire-ember-drift").Modifiers,
            PassiveTreeCatalog.Get("fire-scorching-winds").Modifiers,
            PassiveTreeCatalog.Get("fire-conflagration").Modifiers,
            PassiveTreeCatalog.Get("fire-spread-crown").Modifiers,
        });

        var affected = modifiers.Apply(BuildStatId.MutationRadius, 46);
        Assert.IsTrue(affected > 46);
        Assert.AreEqual(0, modifiers.Rules.Count);
    }
}
