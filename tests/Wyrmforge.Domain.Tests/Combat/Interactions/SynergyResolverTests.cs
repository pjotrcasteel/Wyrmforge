using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Interactions;

namespace Wyrmforge.Domain.Tests.Combat.Interactions;

[TestClass]
public sealed class SynergyResolverTests
{
    private static readonly SynergyRule A = new("a", EffectLifetime.ArcaneWeb, EffectTags.Kill, SynergyOutput.Explosion, .4, 40, "kill");
    private static readonly SynergyRule B = new("b", EffectLifetime.Hunt, EffectTags.Kill, SynergyOutput.Explosion, .4, 40, "kill");

    [TestMethod]
    public void Resolution_IsOrderIndependentAndSamePurposeStackingDiminishes()
    {
        var input = new SynergyEvent(EffectTags.Kill, 100, []);
        var first = SynergyResolver.Resolve([A, B], input, new(10));
        var second = SynergyResolver.Resolve([B, A, A], input, new(10));
        CollectionAssert.AreEqual(first.Select(item => item.Damage).ToArray(), second.Select(item => item.Damage).ToArray());
        Assert.AreEqual(40, first[0].Damage);
        Assert.AreEqual(20, first[1].Damage);
    }

    [TestMethod]
    public void Ancestry_PreventsReentryAndNeverAmplifiesParentDamage()
    {
        var root = new SynergyEvent(EffectTags.Kill, 100, []);
        var budget = new ReactionBudget(10);
        var first = SynergyResolver.Resolve([A], root, budget).Single();
        var second = SynergyResolver.Resolve([A, B], first.Child with { Tags = EffectTags.Kill }, budget).Single();
        Assert.AreEqual("b", second.SourceId);
        Assert.AreEqual(40, second.Damage);
        Assert.AreEqual(0, SynergyResolver.Resolve([A, B], second.Child with { Tags = EffectTags.Kill }, budget).Count);
    }

    [TestMethod]
    public void CrowdedStep_UsesSharedBudgetAndRejectsNonfiniteInputs()
    {
        var budget = new ReactionBudget(3);
        var root = new SynergyEvent(EffectTags.Kill, 100, []);
        for (var i = 0; i < 1000; i++) SynergyResolver.Resolve([A, B], root, budget);
        Assert.AreEqual(3, budget.SpentThisStep);
        Assert.IsTrue(budget.Suppressed > 0);
        budget.BeginStep();
        Assert.AreEqual(0, SynergyResolver.Resolve([A], root with { RootDamage = double.NaN }, budget).Count);
        Assert.AreEqual(0, budget.SpentThisStep);
        Assert.AreEqual(0, SynergyResolver.Resolve([A], root with { Tags = EffectTags.Impact }, budget).Count);
    }
}
