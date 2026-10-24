using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Domain.Tests.Spells;

[TestClass]
public sealed class FireballMutationSetTests
{
    [TestMethod]
    public void Resolve_OneSignatureWithAllPlayableMutators_PreservesEveryMechanicalEffect()
    {
        var equipped = new[]
        {
            FireballMutationId.CinderNeedle, FireballMutationId.ScorchedEarth,
            FireballMutationId.Detonation, FireballMutationId.MeteorHeart,
        };
        var first = FireballMutationSet.Resolve(equipped);
        var reordered = FireballMutationSet.Resolve(equipped.Reverse());

        Assert.AreEqual(15, first.Mask);
        Assert.AreEqual(first, reordered, "Physical socket order must not change event identity.");
        foreach (var id in equipped) Assert.IsTrue(first.Has(id));
        Assert.IsFalse(first.Has(FireballMutationId.PhoenixVolley));
        Assert.IsFalse(first.Has((FireballMutationId)999));
        Assert.IsFalse(first.Has((FireballMutationId)0));
    }

    [TestMethod]
    public void Resolve_PlannedMutatorsAndDuplicates_CannotGrantUnimplementedEffects()
    {
        var set = FireballMutationSet.Resolve([
            FireballMutationId.PhoenixVolley, FireballMutationId.Wildfire,
            FireballMutationId.Detonation, FireballMutationId.Detonation,
            FireballMutationId.MeteorHeart, FireballMutationId.CinderNeedle,
        ]);

        Assert.AreEqual(11, set.Mask);
        Assert.IsFalse(set.Has(FireballMutationId.PhoenixVolley));
        Assert.IsFalse(set.Has(FireballMutationId.Wildfire));
    }

    [TestMethod]
    public void Resolve_VisualProjectionCannotAuthorizeOrSuppressGameplay()
    {
        var prepared = FireballMutationSet.Resolve([
            FireballMutationId.MeteorHeart, FireballMutationId.ScorchedEarth,
        ]);
        var visual = FireballVisualRecipe.Resolve(1, [
            FireballMutationId.MeteorHeart, FireballMutationId.ScorchedEarth,
        ]);

        Assert.AreEqual(prepared.Mask, visual.MutationMask,
            "A visual recipe only observes the actually prepared playable mutations.");
        Assert.IsTrue(prepared.Has(FireballMutationId.ScorchedEarth),
            "Presentation level does not silently remove valid legacy pre-Hunt effects.");
    }
}
