using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Domain.Tests.Progression.PassiveTree;

[TestClass]
public sealed class PassiveTreePlannerTests
{
    [TestMethod]
    public void Plan_FromWyrmheartToFireKeystone_ReturnsMeaningfulRouteAndCost()
    {
        var selection = new PassiveTreeSelection();

        var plan = PassiveTreePlanner.Plan(selection, "inferno");

        Assert.IsNotNull(plan);
        CollectionAssert.AreEqual(new[] { "fire-start", "fire-1", "fire-2", "fire-major", "wildfire", "inferno" }, plan.NodeIds.ToArray());
        Assert.AreEqual(10, plan.AdditionalCost);
    }

    [TestMethod]
    public void Plan_WhenPartOfRouteIsAllocated_StartsAtClosestTraversedAnchor()
    {
        var selection = new PassiveTreeSelection();
        Assert.IsTrue(selection.Select("fire-start"));
        Assert.IsTrue(selection.Select("fire-1"));

        var plan = PassiveTreePlanner.Plan(selection, "inferno");

        Assert.IsNotNull(plan);
        CollectionAssert.AreEqual(new[] { "fire-2", "fire-major", "wildfire", "inferno" }, plan.NodeIds.ToArray());
        Assert.AreEqual(8, plan.AdditionalCost);
    }

    [TestMethod]
    public void Plan_WhenCompetingMasteryIsAlreadySelected_RejectsLockedBranch()
    {
        var selection = new PassiveTreeSelection();
        Assert.IsTrue(selection.SelectPath(["fire-start", "fire-1", "fire-2", "fire-major", "detonation"]));

        var plan = PassiveTreePlanner.Plan(selection, "inferno");

        Assert.IsNull(plan);
    }

    [TestMethod]
    public void SelectPath_WhenRouteFitsBudget_AllocatesEntirePreviewAtomically()
    {
        var selection = new PassiveTreeSelection();

        var selected = selection.SelectPath(["fire-start", "fire-1", "fire-2", "fire-major", "wildfire", "inferno"]);

        Assert.IsTrue(selected);
        Assert.IsTrue(selection.Selected.Contains("inferno"));
        Assert.AreEqual(10, selection.SpentPoints);
    }

    [TestMethod]
    public void SelectPath_WhenRouteExceedsBudget_RollsBackAllNewNodes()
    {
        var selection = new PassiveTreeSelection(4);

        var selected = selection.SelectPath(["fire-start", "fire-1", "fire-2", "fire-major"]);

        Assert.IsFalse(selected);
        Assert.AreEqual(0, selection.SpentPoints);
        Assert.AreEqual(0, selection.Selected.Count);
    }
}
