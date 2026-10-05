using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Resonance;

[TestClass]
public sealed class ResonanceThresholdResolverTests
{
    [TestMethod]
    public void Resolve_PureSchoolAtThreshold_ActivatesPureEffect()
    {
        RunResonanceEntry[] resonance = [new(SpellSchool.Fire, ResonanceThresholdCatalog.PureThreshold)];

        var active = ResonanceThresholdResolver.Resolve(resonance);

        var threshold = active.Single(effect => effect.Id == "fire-attuned");
        var modifiers = BuildModifierSet.Aggregate([threshold.Modifiers]);
        Assert.AreEqual(1.10d, modifiers.Apply(BuildStatId.Damage, 1), 0.0001);
    }

    [TestMethod]
    public void Resolve_PureSchoolBelowThreshold_DoesNotActivatePureEffect()
    {
        RunResonanceEntry[] resonance = [new(SpellSchool.Fire, ResonanceThresholdCatalog.PureThreshold - 1)];

        var active = ResonanceThresholdResolver.Resolve(resonance);

        Assert.IsFalse(active.Any(effect => effect.Id == "fire-attuned"));
    }

    [TestMethod]
    public void Resolve_HybridAtThreshold_ActivatesHybridEffect()
    {
        RunResonanceEntry[] resonance =
        [
            new(SpellSchool.Fire, ResonanceThresholdCatalog.HybridThreshold),
            new(SpellSchool.Frost, ResonanceThresholdCatalog.HybridThreshold),
        ];

        var active = ResonanceThresholdResolver.Resolve(resonance);

        Assert.IsTrue(active.Any(effect => effect.Id == "thermal-flux"));
    }

    [TestMethod]
    public void Resolve_HybridMissingOneRequirement_DoesNotActivateHybridEffect()
    {
        RunResonanceEntry[] resonance =
        [
            new(SpellSchool.Fire, ResonanceThresholdCatalog.HybridThreshold),
            new(SpellSchool.Frost, ResonanceThresholdCatalog.HybridThreshold - 1),
        ];

        var active = ResonanceThresholdResolver.Resolve(resonance);

        Assert.IsFalse(active.Any(effect => effect.Id == "thermal-flux"));
    }
}
