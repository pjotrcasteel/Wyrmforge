using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Domain.Tests.Spells;

[TestClass]
public sealed class FireballVisualRecipeTests
{
    [TestMethod]
    public void Resolve_ThreeEquippedMutations_ProducesOneDeterministicRecipe()
    {
        var original = FireballVisualRecipe.Resolve(3,
            [FireballMutationId.MeteorHeart, FireballMutationId.Detonation, FireballMutationId.ScorchedEarth]);
        var reordered = FireballVisualRecipe.Resolve(3,
            [FireballMutationId.ScorchedEarth, FireballMutationId.MeteorHeart, FireballMutationId.Detonation]);

        Assert.AreEqual(original, reordered);
        Assert.AreEqual("fireball-v1-l3-m007", original.CacheKey);
        Assert.IsTrue(original.Has(FireballMutationId.MeteorHeart));
        Assert.IsTrue(original.Has(FireballMutationId.Detonation));
        Assert.IsTrue(original.Has(FireballMutationId.ScorchedEarth));
        Assert.IsFalse(original.Has(FireballMutationId.CinderNeedle));
    }

    [TestMethod]
    public void Resolve_UnimplementedAndDuplicateMutations_DoNotAppearInArt()
    {
        var recipe = FireballVisualRecipe.Resolve(5,
            [FireballMutationId.Detonation, FireballMutationId.Detonation, FireballMutationId.Wildfire,
                FireballMutationId.PhoenixVolley]);

        Assert.AreEqual(1 << ((int)FireballMutationId.Detonation - 1), recipe.MutationMask);
        Assert.IsFalse(recipe.Has(FireballMutationId.Wildfire));
        Assert.IsFalse(recipe.Has(FireballMutationId.PhoenixVolley));
    }

    [TestMethod]
    public void Resolve_SavedCore_OnlyIncludesEarnedAndEquippedMutations()
    {
        var core = new FireballCoreState();
        core.Restore(new FireballCoreSave(3, [FireballMutationId.Detonation, FireballMutationId.MeteorHeart],
            [FireballMutationId.Detonation, FireballMutationId.MeteorHeart, FireballMutationId.Wildfire]));
        var recipe = FireballVisualRecipe.Resolve(core);

        Assert.AreEqual(3, recipe.Level);
        Assert.IsTrue(recipe.Has(FireballMutationId.Detonation));
        Assert.IsTrue(recipe.Has(FireballMutationId.MeteorHeart));
        Assert.IsFalse(recipe.Has(FireballMutationId.Wildfire));
        Assert.AreEqual(2, core.Equipped.Count);
    }
}
