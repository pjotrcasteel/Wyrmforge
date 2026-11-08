using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Domain.Tests.Progression.PassiveTree;

[TestClass]
public sealed class ArcaneConstellationTests
{
    [TestMethod]
    [DataRow(PassiveSchool.Fire, 2)]
    [DataRow(PassiveSchool.Frost, 1)]
    [DataRow(PassiveSchool.Storm, 1)]
    [DataRow(PassiveSchool.Arcane, 1)]
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
}
