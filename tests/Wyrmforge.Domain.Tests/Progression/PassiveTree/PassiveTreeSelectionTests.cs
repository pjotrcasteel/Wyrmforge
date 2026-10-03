using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Domain.Tests.Progression.PassiveTree;

[TestClass]
public sealed class PassiveTreeSelectionTests
{
    [TestMethod]
    public void Select_WhenPrerequisitesAreMet_SelectsNode()
    {
        var selection = new PassiveTreeSelection();

        Assert.IsTrue(selection.Select("fire-1"));
        Assert.IsTrue(selection.Select("fire-2"));
        Assert.IsTrue(selection.Select("fire-major"));
        Assert.AreEqual(4, selection.SpentPoints);
    }

    [TestMethod]
    public void Select_WhenCompetingEpicIsSelected_RejectsOtherPath()
    {
        var selection = CreateFireMajorSelection();
        Assert.IsTrue(selection.Select("wildfire"));

        Assert.IsFalse(selection.CanSelect("detonation"));
        Assert.IsFalse(selection.Select("detonation"));
    }

    [TestMethod]
    public void Select_WhenLegendaryAlreadySelected_RejectsSecondLegendary()
    {
        var selection = CreateFireMajorSelection(30);
        Assert.IsTrue(selection.Select("wildfire"));
        Assert.IsTrue(selection.Select("inferno"));
        Assert.IsTrue(selection.Select("frost-1"));
        Assert.IsTrue(selection.Select("frost-2"));
        Assert.IsTrue(selection.Select("frost-major"));
        Assert.IsTrue(selection.Select("deep-freeze"));

        Assert.IsFalse(selection.CanSelect("absolute-zero"));
        Assert.IsFalse(selection.Select("absolute-zero"));
    }

    [TestMethod]
    public void Select_WhenPointBudgetWouldBeExceeded_RejectsNode()
    {
        var selection = CreateFireMajorSelection();
        Assert.IsTrue(selection.Select("wildfire"));
        Assert.IsTrue(selection.Select("inferno"));
        Assert.IsTrue(selection.Select("frost-1"));
        Assert.IsTrue(selection.Select("frost-2"));

        Assert.AreEqual(14, selection.SpentPoints);
        Assert.IsFalse(selection.CanSelect("frost-major"));
    }

    private static PassiveTreeSelection CreateFireMajorSelection(int pointBudget = PassiveTreeCatalog.TotalPoints)
    {
        var selection = new PassiveTreeSelection(pointBudget);
        Assert.IsTrue(selection.Select("fire-1"));
        Assert.IsTrue(selection.Select("fire-2"));
        Assert.IsTrue(selection.Select("fire-major"));
        return selection;
    }
}
