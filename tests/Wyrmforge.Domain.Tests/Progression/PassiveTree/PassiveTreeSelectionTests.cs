using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Domain.Tests.Progression.PassiveTree;

[TestClass]
public sealed class PassiveTreeSelectionTests
{
    [TestMethod]
    public void Select_WhenNodeTouchesOrigin_SelectsNode()
    {
        var selection = new PassiveTreeSelection();

        Assert.IsTrue(selection.Select("fire-start"));
        Assert.AreEqual(1, selection.SpentPoints);
    }

    [TestMethod]
    public void Select_WhenNodeIsNotConnected_RejectsNode()
    {
        var selection = new PassiveTreeSelection();

        Assert.IsFalse(selection.CanSelect("fire-major"));
        Assert.IsFalse(selection.Select("fire-major"));
    }

    [TestMethod]
    public void Select_WhenCompetingMasteryIsSelected_RejectsOtherMastery()
    {
        var selection = CreateFireNotableSelection();
        Assert.IsTrue(selection.Select("wildfire"));

        Assert.IsFalse(selection.CanSelect("detonation"));
        Assert.IsFalse(selection.Select("detonation"));
    }

    [TestMethod]
    public void Remove_WhenNodeWouldDisconnectAllocatedPath_RejectsRemoval()
    {
        var selection = CreateFireNotableSelection();
        Assert.IsTrue(selection.Select("wildfire"));

        Assert.IsFalse(selection.CanRemove("fire-1"));
        Assert.IsFalse(selection.Remove("fire-1"));
    }

    [TestMethod]
    public void Select_WhenHybridPathIsAllocated_EntersAdjacentSchoolWithoutReturningToOrigin()
    {
        var selection = new PassiveTreeSelection(40);
        Assert.IsTrue(selection.Select("fire-start"));
        Assert.IsTrue(selection.Select("fire-1"));
        Assert.IsTrue(selection.Select("fire-frost-gate"));
        Assert.IsTrue(selection.Select("hybrid-fire-frost-1"));
        Assert.IsTrue(selection.Select("hybrid-fire-frost-2"));
        Assert.IsTrue(selection.Select("frost-fire-gate"));
        Assert.IsTrue(selection.Select("frost-1"));

        Assert.IsTrue(selection.CanSelect("frost-2"));
    }

    [TestMethod]
    public void Select_WhenBudgetAllows_CanReachMultipleKeystones()
    {
        var selection = new PassiveTreeSelection(60);
        AllocateFireKeystone(selection);
        Assert.IsTrue(selection.Select("storm-start"));
        Assert.IsTrue(selection.Select("storm-1"));
        Assert.IsTrue(selection.Select("storm-2"));
        Assert.IsTrue(selection.Select("storm-major"));
        Assert.IsTrue(selection.Select("chainstorm"));

        Assert.IsTrue(selection.Select("living-storm"));
        Assert.AreEqual(2, selection.Selected.Select(PassiveTreeCatalog.Get).Count(node => node.Kind == PassiveNodeKind.Keystone));
    }

    [TestMethod]
    public void Select_WhenPointBudgetWouldBeExceeded_RejectsNode()
    {
        var selection = new PassiveTreeSelection(4);
        Assert.IsTrue(selection.Select("fire-start"));
        Assert.IsTrue(selection.Select("fire-1"));
        Assert.IsTrue(selection.Select("fire-2"));

        Assert.IsFalse(selection.CanSelect("fire-major"));
    }

    private static PassiveTreeSelection CreateFireNotableSelection()
    {
        var selection = new PassiveTreeSelection();
        Assert.IsTrue(selection.Select("fire-start"));
        Assert.IsTrue(selection.Select("fire-1"));
        Assert.IsTrue(selection.Select("fire-2"));
        Assert.IsTrue(selection.Select("fire-major"));
        return selection;
    }

    private static void AllocateFireKeystone(PassiveTreeSelection selection)
    {
        Assert.IsTrue(selection.Select("fire-start"));
        Assert.IsTrue(selection.Select("fire-1"));
        Assert.IsTrue(selection.Select("fire-2"));
        Assert.IsTrue(selection.Select("fire-major"));
        Assert.IsTrue(selection.Select("wildfire"));
        Assert.IsTrue(selection.Select("inferno"));
    }
}
