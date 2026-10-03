using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Tests.Progression.DragonEssences;

[TestClass]
public sealed class DragonEssenceSelectionTests
{
    [TestMethod]
    public void Select_SameEssenceTwice_StoresOnlyOne()
    {
        var selection = new DragonEssenceSelection();

        Assert.IsTrue(selection.Select(DragonEssenceId.CinderHeart));
        Assert.IsFalse(selection.Select(DragonEssenceId.CinderHeart));
        Assert.AreEqual(1, selection.Count);
    }

    [TestMethod]
    public void AshfangChoices_ExposeThreeDistinctBuildDirections()
    {
        var choices = DragonEssenceCatalog.AshfangChoices;

        Assert.AreEqual(3, choices.Count);
        CollectionAssert.AreEquivalent(
            new[] { DragonEssenceId.CinderHeart, DragonEssenceId.MoltenFang, DragonEssenceId.AshenWing },
            choices.Select(choice => choice.Id).ToArray());
    }
}
