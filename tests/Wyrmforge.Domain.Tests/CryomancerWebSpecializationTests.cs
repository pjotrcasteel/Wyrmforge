using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests;

[TestClass]
public sealed class CryomancerWebSpecializationTests
{
    private static readonly string[] ColdControlIds =
    [
        "frost-rime-threads", "frost-glasswind", "frost-cold-snap", "frost-arctic-focus",
        "frost-whiteout", "frost-pale-silence",
    ];

    private static readonly string[] SanctuaryIds =
    [
        "frost-snowward", "frost-iceweave", "frost-frozen-blood", "frost-crystal-bulwark",
        "frost-veil", "frost-everwinter",
    ];

    [TestMethod]
    public void Catalog_CryomancerBranches_AreConnectedAndHaveThreeTiers()
    {
        foreach (var id in ColdControlIds.Concat(SanctuaryIds))
        {
            var node = PassiveTreeCatalog.Get(id);
            Assert.AreEqual(PassiveSchool.Frost, node.School);
            Assert.IsTrue(PassiveTreeCatalog.Neighbors(id).Count > 0, $"Disconnected node: {id}");
        }

        Assert.AreEqual(PassiveNodeTier.Minor, PassiveNodeTiers.For(PassiveTreeCatalog.Get("frost-rime-threads")));
        Assert.AreEqual(PassiveNodeTier.Medium, PassiveNodeTiers.For(PassiveTreeCatalog.Get("frost-arctic-focus")));
        Assert.AreEqual(PassiveNodeTier.Major, PassiveNodeTiers.For(PassiveTreeCatalog.Get("frost-pale-silence")));
        Assert.AreEqual(PassiveNodeTier.Major, PassiveNodeTiers.For(PassiveTreeCatalog.Get("frost-everwinter")));
    }

    [TestMethod]
    public void ColdControl_AppliesToFrostFreezeAndChillButNotToFire()
    {
        var selected = ColdControlIds.Select(id => PassiveTreeCatalog.Get(id).Modifiers);
        var modifiers = BuildModifierSet.Aggregate(selected);
        var frozen = FrostControlDurationModifier.Apply(SpellSchool.Frost, CombatStatusId.Frozen, 1, modifiers);
        var chilled = FrostControlDurationModifier.Apply(SpellSchool.Frost, CombatStatusId.Chilled, 2, modifiers);

        Assert.IsTrue(frozen > 1 && frozen <= 1.5);
        Assert.AreEqual(frozen * 2, chilled, 0.00001);
        Assert.AreEqual(1d, FrostControlDurationModifier.Apply(SpellSchool.Fire, CombatStatusId.Frozen, 1, modifiers), 0.00001);
        Assert.AreEqual(1d, FrostControlDurationModifier.Apply(SpellSchool.Frost, CombatStatusId.Burning, 1, modifiers), 0.00001);
        Assert.AreEqual(1d, FrostControlDurationModifier.Apply(SpellSchool.Storm, CombatStatusId.Shocked, 1, modifiers), 0.00001);
        Assert.AreEqual(100, modifiers.Apply(BuildStatId.Damage, 100), 0.00001);
    }

    [TestMethod]
    public void ColdControl_CannotIncreaseCrowdControlBeyondTheHardCap()
    {
        var modifiers = BuildModifierSet.Aggregate([
            new BuildModifierProfile([new(BuildStatId.FrostControlDuration, BuildStatOperation.Multiply, 4)]),
        ]);

        Assert.AreEqual(1.5, FrostControlDurationModifier.Apply(SpellSchool.Frost, CombatStatusId.Frozen, 1, modifiers), 0.00001);
    }

    [TestMethod]
    public void Sanctuary_ImprovesVitalityAndDefenceWithoutModifyingFreezeDuration()
    {
        var modifiers = BuildModifierSet.Aggregate(SanctuaryIds.Select(id => PassiveTreeCatalog.Get(id).Modifiers));

        Assert.AreEqual(115, modifiers.Apply(BuildStatId.MaxHealth, 100), 0.00001);
        Assert.IsTrue(modifiers.Apply(BuildStatId.DamageTaken, 100) < 100);
        Assert.AreEqual(1, FrostControlDurationModifier.Apply(SpellSchool.Frost, CombatStatusId.Frozen, 1, modifiers), 0.00001);
    }

    [TestMethod]
    public void ActiveCryomancer_CanReachColdMajorButNotBothExclusiveMasteryBranches()
    {
        var selection = new PassiveTreeSelection();
        selection.SetActiveSchool(PassiveSchool.Frost);
        var route = PassiveTreePlanner.Plan(selection, "frost-pale-silence");

        Assert.IsNotNull(route);
        Assert.IsTrue(route.NodeIds.Contains("deep-freeze"));
        Assert.IsTrue(route.NodeIds.Contains("frost-arctic-focus"));
        Assert.IsTrue(route.AdditionalCost <= selection.AvailablePoints);
        Assert.IsTrue(selection.SelectPath(route.NodeIds));
        Assert.IsTrue(selection.Selected.Contains("frost-pale-silence"));
        Assert.IsNull(PassiveTreePlanner.Plan(selection, "frost-everwinter"));
    }

    [TestMethod]
    public void InactiveFrostSchool_PreservesLearnedBonusesButBlocksNewNodes()
    {
        var selection = new PassiveTreeSelection();
        selection.SetActiveSchool(PassiveSchool.Frost);
        Assert.IsTrue(selection.Select("frost-start"));
        selection.SetActiveSchool(PassiveSchool.Fire);
        Assert.IsTrue(selection.Selected.Contains("frost-start"));
        Assert.IsFalse(selection.CanSelect("frost-rime-threads"));
        Assert.IsNull(PassiveTreePlanner.Plan(selection, "frost-everwinter"));
    }
}
