using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Domain.Tests.Progression.PassiveTree;

[TestClass]
public sealed class FireOuterRouteTests
{
    [TestMethod]
    [DataRow("enduring", BuildStatId.MutationDuration)]
    [DataRow("furnace", BuildStatId.BurnDamage)]
    [DataRow("shelter", BuildStatId.MaxHealth)]
    public void OuterGoal_IsEarnableAndSurvivesInactiveReloadAndRefund(string route, BuildStatId stat)
    {
        var selection = new PassiveTreeSelection();
        selection.SetActiveSchool(PassiveSchool.Fire);
        var target = $"fire-{route}-5";
        var plan = PassiveTreePlanner.Plan(selection, target);
        Assert.IsNotNull(plan);
        Assert.IsTrue(selection.SelectPath(plan.NodeIds));
        Assert.AreEqual(24, selection.SpentPoints);
        Assert.AreEqual(0, selection.AvailablePoints);
        var saved = selection.Selected.ToArray();
        selection.SetActiveSchool(PassiveSchool.Frost);
        selection.RestoreNodes(saved.Reverse());
        CollectionAssert.AreEquivalent(saved, selection.Selected.ToArray());
        Assert.IsFalse(selection.Remove("fire-pyre-crossroads"));
        Assert.IsTrue(selection.Remove(target));
        Assert.AreEqual(3, selection.AvailablePoints);
        Assert.IsFalse(selection.Select(target));
        selection.SetActiveSchool(PassiveSchool.Fire);
        Assert.IsTrue(selection.Select(target));

        var branch = Enumerable.Range(1, 5).Select(step => PassiveTreeCatalog.Get($"fire-{route}-{step}"));
        var modifiers = BuildModifierSet.Aggregate(branch.Select(node => node.Modifiers));
        Assert.AreEqual(117, modifiers.Apply(stat, 100), .00001);
        Assert.AreEqual(100, modifiers.Apply(BuildStatId.Damage, 100), .00001);
        Assert.IsTrue(branch.All(node => node.Modifiers.Stats.Count == 1));
    }
}
