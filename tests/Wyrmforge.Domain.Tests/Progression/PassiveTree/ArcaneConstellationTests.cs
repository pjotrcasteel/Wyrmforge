using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Domain.Tests.Progression.PassiveTree;

[TestClass]
public sealed class ArcaneConstellationTests
{
    [TestMethod]
    [DataRow(PassiveSchool.Fire, 2)]
    public void ConstellationEntryCanBeLearnedAndSurvivesSchoolSwitch(PassiveSchool school, int ring)
    {
        var selection = new PassiveTreeSelection();
        selection.SetActiveSchool(school);
        var entry = $"constellation-{school}-{ring}-0";
        var plan = PassiveTreePlanner.Plan(selection, entry);
        Assert.IsNotNull(plan);
        Assert.IsTrue(selection.SelectPath(plan.NodeIds));

        var clockwise = $"constellation-{school}-{ring}-1";
        var counterclockwise = $"constellation-{school}-{ring}-7";
        Assert.IsTrue(selection.CanSelect(clockwise));
        Assert.IsTrue(selection.CanSelect(counterclockwise));
        Assert.IsTrue(selection.Select(clockwise));
        var spent = selection.SpentPoints;

        selection.SetActiveSchool(school == PassiveSchool.Fire ? PassiveSchool.Frost : PassiveSchool.Fire);
        Assert.IsTrue(selection.Selected.Contains(clockwise));
        Assert.AreEqual(spent, selection.SpentPoints);
        Assert.IsFalse(selection.CanSelect(counterclockwise));
        Assert.IsTrue(selection.Remove(clockwise));
        Assert.AreEqual(spent - 1, selection.SpentPoints);
    }
    [TestMethod]
    public void EachFireConstellationNodeCanBeReachedWithinThePointBudget()
    {
        var selection = new PassiveTreeSelection();
        selection.SetActiveSchool(PassiveSchool.Fire);
        var nodes = PassiveTreeCatalog.All.Where(node => node.Id.StartsWith("constellation-Fire-", StringComparison.Ordinal)).ToArray();
        Assert.AreEqual(225, nodes.Length);
        foreach (var node in nodes)
        {
            var plan = PassiveTreePlanner.Plan(selection, node.Id);
            Assert.IsNotNull(plan, node.Id);
            Assert.IsTrue(plan.AdditionalCost <= selection.AvailablePoints,
                $"{node.Id} costs {plan.AdditionalCost}, budget is {selection.AvailablePoints}.");
        }
    }
}
