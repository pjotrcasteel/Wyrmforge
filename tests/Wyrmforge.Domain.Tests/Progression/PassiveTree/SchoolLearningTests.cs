using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Stats;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Progression.Loadouts;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Domain.Tests.Progression.PassiveTree;

[TestClass]
public sealed class SchoolLearningTests
{
    [TestMethod]
    public void Select_InactiveSchool_RejectsDirectAndPlannedInvestment()
    {
        var selection = new PassiveTreeSelection();
        selection.SetActiveSchool(PassiveSchool.Fire);
        Assert.IsFalse(selection.Select("storm-start"));
        Assert.IsNull(PassiveTreePlanner.Plan(selection, "storm-major"));
        Assert.IsTrue(selection.Select("fire-start"));
    }

    [TestMethod]
    public void SwitchSchool_LearnedStormSpeed_StillContributesToFireBuild()
    {
        var selection = new PassiveTreeSelection();
        selection.SetActiveSchool(PassiveSchool.Storm);
        Assert.IsTrue(selection.Select("storm-start"));
        selection.SetActiveSchool(PassiveSchool.Fire);
        Assert.IsTrue(selection.Select("fire-start"));
        var profile = PassiveCombatProfile.Create(selection.Selected);
        Assert.IsTrue(profile.CastIntervalMultiplier < 1);
        Assert.IsTrue(profile.DamageMultiplier > 1);
        Assert.AreEqual(2, selection.SpentPoints);
        Assert.AreEqual(24, selection.PointBudget);
    }

    [TestMethod]
    public void Remove_InactiveNode_ReservesRefundUntilItsSchoolReturns()
    {
        var selection = new PassiveTreeSelection(2);
        selection.SetActiveSchool(PassiveSchool.Storm);
        selection.Select("storm-start");
        selection.SetActiveSchool(PassiveSchool.Fire);
        selection.Select("fire-start");
        Assert.IsTrue(selection.Remove("storm-start"));
        Assert.AreEqual(1, selection.Reserved[PassiveSchool.Storm]);
        Assert.AreEqual(0, selection.AvailablePoints);
        Assert.IsFalse(selection.Select("fire-1"));
        selection.SetActiveSchool(PassiveSchool.Storm);
        Assert.AreEqual(0, selection.ReservedPoints);
        Assert.AreEqual(1, selection.AvailablePoints);
        Assert.IsTrue(selection.Select("storm-start"));
    }

    [TestMethod]
    public void Reset_MixedSchoolInvestments_PreservesInactiveReservations()
    {
        var selection = new PassiveTreeSelection(2);
        selection.RestoreNodes(["storm-start", "fire-start"]);
        selection.SetActiveSchool(PassiveSchool.Fire);
        selection.Reset();
        Assert.AreEqual(0, selection.SpentPoints);
        Assert.AreEqual(1, selection.ReservedPoints);
        Assert.AreEqual(1, selection.AvailablePoints);
    }

    [TestMethod]
    public void Restore_SaveWithInactiveKnowledge_PreservesItWithoutTeachingNewNodes()
    {
        var selection = new PassiveTreeSelection(4);
        selection.SetActiveSchool(PassiveSchool.Fire);
        selection.RestoreNodes(["storm-start", "storm-1", "fire-start"]);
        selection.RestoreReserved(new Dictionary<PassiveSchool, int> { [PassiveSchool.Frost] = 1 });
        Assert.AreEqual(3, selection.Selected.Count);
        Assert.AreEqual(0, selection.AvailablePoints);
        Assert.IsFalse(selection.Select("storm-2"));
        Assert.IsTrue(PassiveCombatProfile.Create(selection.Selected).CastIntervalMultiplier < 1);
    }

    [TestMethod]
    public void ApplyLoadout_InactiveNodes_CannotLearnOrEraseOtherSchools()
    {
        var source = new PassiveTreeSelection();
        source.RestoreNodes(["storm-start", "storm-1"]);
        var book = new HuntLoadoutBook();
        var laboratory = new LaboratoryState();
        book.Save(0, source, laboratory);
        var target = new PassiveTreeSelection();
        target.RestoreNodes(["frost-start", "fire-start"]);
        target.SetActiveSchool(PassiveSchool.Fire);
        var result = book.Apply(0, target, laboratory);
        Assert.IsNotNull(result);
        Assert.IsTrue(target.Selected.Contains("frost-start"));
        Assert.IsFalse(target.Selected.Contains("storm-start"));
        Assert.AreEqual(2, result.NodesSkipped);
    }

    [TestMethod]
    public void RestoreReserved_MalformedAmounts_NeverExceedsEarnedBudget()
    {
        var selection = new PassiveTreeSelection(2);
        selection.RestoreNodes(["fire-start"]);
        selection.RestoreReserved(new Dictionary<PassiveSchool, int>
        {
            [PassiveSchool.Storm] = int.MaxValue,
            [PassiveSchool.Frost] = -1,
            [(PassiveSchool)999] = 10,
        });
        Assert.AreEqual(1, selection.ReservedPoints);
        Assert.AreEqual(0, selection.AvailablePoints);
        Assert.AreEqual(2, selection.PointBudget);
    }
    [TestMethod]
    public void MutationEnhancement_RequiresDiscovery_AndOnlyAffectsMatchingRecipe()
    {
        var selection = new PassiveTreeSelection();
        selection.SetActiveSchool(PassiveSchool.Fire);
        selection.SetKnownFireballMutations([]);
        selection.Select("fire-start");
        selection.Select("fire-1");
        Assert.IsFalse(selection.Select("fire-needle-practice"));
        selection.SetKnownFireballMutations([FireballMutationId.CinderNeedle]);
        Assert.IsTrue(selection.Select("fire-needle-practice"));
        selection.SetActiveSchool(PassiveSchool.Storm);
        Assert.AreEqual(1d, PassiveCombatProfile.Create(selection.Selected).ProjectileSpeedMultiplier);
        Assert.AreEqual(1.1d, PassiveNodeEffects.ResolveConditional(selection.Selected, SpellId.FireBolt,
            new HashSet<FireballMutationId> { FireballMutationId.CinderNeedle }).Apply(BuildStatId.ProjectileSpeed, 1), .00001);
        Assert.AreEqual(1d, PassiveNodeEffects.ResolveConditional(selection.Selected, SpellId.FireBolt,
            new HashSet<FireballMutationId>()).Apply(BuildStatId.ProjectileSpeed, 1));
        Assert.AreEqual(1d, PassiveNodeEffects.ResolveConditional(selection.Selected, SpellId.FrostShard,
            new HashSet<FireballMutationId> { FireballMutationId.CinderNeedle }).Apply(BuildStatId.ProjectileSpeed, 1));
    }
}
