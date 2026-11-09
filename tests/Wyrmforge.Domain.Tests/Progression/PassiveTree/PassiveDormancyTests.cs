using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Stats;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Domain.Tests.Progression.PassiveTree;

[TestClass]
public sealed class PassiveDormancyTests
{
    [TestMethod]
    public void FrostDefence_HasReducedAlternativeWithoutInactiveTriggers()
    {
        var nodes = new HashSet<string> { "frost-start", "frost-1", "frost-2", "frost-major", "ice-armor", "winter-shell" };
        var active = PassiveCombatProfile.Create(nodes, PassiveSchool.Frost);
        var dormant = PassiveCombatProfile.Create(nodes, PassiveSchool.Fire);
        Assert.IsTrue(active.IceArmor);
        Assert.IsTrue(active.WinterShell);
        Assert.IsFalse(dormant.IceArmor);
        Assert.IsFalse(dormant.WinterShell);
        Assert.IsTrue(dormant.DamageTakenMultiplier > active.DamageTakenMultiplier);
        Assert.IsTrue(dormant.DamageTakenMultiplier < 1);
        Assert.AreEqual(100, dormant.MaxHealth);
    }

    [TestMethod]
    public void SwitchAwayAndBack_RestoresSameEffectsAndPoints()
    {
        var selection = new PassiveTreeSelection(8);
        selection.SetActiveSchool(PassiveSchool.Fire);
        selection.SelectPath(["fire-start", "fire-1", "fire-2", "fire-major", "wildfire"]);
        var before = PassiveCombatProfile.Create(selection.Selected, selection.ActiveSchool);
        var nodes = selection.Selected.ToArray();
        var available = selection.AvailablePoints;
        selection.SetActiveSchool(PassiveSchool.Frost);
        Assert.IsFalse(PassiveCombatProfile.Create(selection.Selected, selection.ActiveSchool).Wildfire);
        Assert.IsFalse(selection.Select("inferno"));
        selection.SetActiveSchool(PassiveSchool.Fire);
        Assert.AreEqual(before, PassiveCombatProfile.Create(selection.Selected, selection.ActiveSchool));
        CollectionAssert.AreEquivalent(nodes, selection.Selected.ToArray());
        Assert.AreEqual(available, selection.AvailablePoints);
    }

    [TestMethod]
    public void LegacyReservations_RepeatedRestoreNeverCreatesPointsOrOrphansPaths()
    {
        var selection = new PassiveTreeSelection(5);
        selection.SetActiveSchool(PassiveSchool.Fire);
        for (var reload = 0; reload < 3; reload++)
        {
            selection.RestoreNodes(["frost-1", "frost-start", "fire-start"]);
            selection.RestoreReserved(new Dictionary<PassiveSchool, int> { [PassiveSchool.Frost] = 2 });
            Assert.AreEqual(2, selection.AvailablePoints);
            Assert.IsFalse(selection.Remove("frost-start"));
        }
        Assert.IsTrue(selection.Remove("frost-1"));
        Assert.IsTrue(selection.Remove("frost-start"));
        Assert.AreEqual(4, selection.AvailablePoints);
        Assert.IsFalse(selection.Remove("frost-start"));
    }
}
