using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.SpellMastery;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Domain.Tests.Progression.SpellMastery;

[TestClass]
public sealed class SpellMasteryStateTests
{
    [TestMethod]
    public void RecordRun_AbandonedOrNoClearedTrail_DoesNotAdvance()
    {
        var state = new SpellMasteryState();
        var abandoned = Evidence(SpellId.FireBolt, 3, DragonId.Ashfang) with { Abandoned = true };
        var noTrail = Evidence(SpellId.FireBolt, 3, DragonId.Ashfang) with { CompletedRoutes = 0 };

        Assert.AreEqual(0, state.RecordRun(abandoned).Progressed.Count);
        Assert.AreEqual(0, state.RecordRun(noTrail).Progressed.Count);
        Assert.AreEqual(0, state.Get(SpellId.FireBolt).MeaningfulRuns);
        Assert.IsFalse(state.Unlocks(SpellEvolutionId.Wyrmfire));
    }

    [TestMethod]
    public void RecordRun_SpellBelowRankTwo_DoesNotAdvance()
    {
        var state = new SpellMasteryState();

        state.RecordRun(Evidence(SpellId.FireBolt, 1, DragonId.Ashfang));

        Assert.AreEqual(0, state.Get(SpellId.FireBolt).MeaningfulRuns);
    }

    [TestMethod]
    public void RecordRun_OnlyMeaningfulRuns_RequiresMatchingWyrmFeat()
    {
        var state = new SpellMasteryState();
        for (var run = 0; run < 4; run++) state.RecordRun(Evidence(SpellId.FireBolt, 2));

        Assert.AreEqual(4, state.Get(SpellId.FireBolt).MeaningfulRuns);
        Assert.IsFalse(state.Unlocks(SpellEvolutionId.Wyrmfire));
        Assert.AreEqual(0, state.RecordRun(Evidence(SpellId.FireBolt, 3, DragonId.Stormcoil)).NewlyUnlocked.Count);

        var unlocked = state.RecordRun(Evidence(SpellId.FireBolt, 3, DragonId.Ashfang));

        CollectionAssert.AreEqual(new[] { SpellEvolutionId.Wyrmfire }, unlocked.NewlyUnlocked.ToArray());
        Assert.IsTrue(state.Unlocks(SpellEvolutionId.Wyrmfire));
        Assert.IsFalse(state.Unlocks(SpellEvolutionId.GlacialRequiem));
        Assert.AreEqual(0, state.RecordRun(Evidence(SpellId.FireBolt, 3, DragonId.Ashfang)).NewlyUnlocked.Count);
    }

    [TestMethod]
    public void RecordRun_WyrmFeatBeforeMasteryThreshold_StillUnlocksAtFourthRun()
    {
        var state = new SpellMasteryState();
        state.RecordRun(Evidence(SpellId.FrostShard, 3, DragonId.Rimeclaw));
        for (var run = 0; run < 2; run++) state.RecordRun(Evidence(SpellId.FrostShard, 2));

        Assert.IsTrue(state.Get(SpellId.FrostShard).WyrmFeat);
        Assert.IsFalse(state.Unlocks(SpellEvolutionId.GlacialRequiem));

        var unlocked = state.RecordRun(Evidence(SpellId.FrostShard, 2));

        CollectionAssert.AreEqual(new[] { SpellEvolutionId.GlacialRequiem }, unlocked.NewlyUnlocked.ToArray());
    }

    [TestMethod]
    public void Restore_SavedProgress_PreservesFeatAndCapsInvalidCounts()
    {
        var state = new SpellMasteryState();
        state.Restore([new SpellMasteryEntry(SpellId.ChainLightning, 4, 5, true),
            new SpellMasteryEntry(SpellId.ArcaneOrb, -10, -3, false)]);

        Assert.IsTrue(state.Unlocks(SpellEvolutionId.TempestAscendant));
        Assert.AreEqual(0, state.Get(SpellId.ArcaneOrb).MeaningfulRuns);
        Assert.AreEqual(0, state.Get(SpellId.ArcaneOrb).BestDepth);
        Assert.AreEqual(4, state.Snapshot().Single(entry => entry.Spell == SpellId.ChainLightning).MeaningfulRuns);
    }

    private static MasteryRunEvidence Evidence(SpellId spell, int rank, params DragonId[] wyrms)
        => new(1, 2, false,
            rank >= 3 && wyrms.Contains(SpellLineageCatalog.Get(spell).Wyrm) ? new HashSet<SpellId> { spell } : new HashSet<SpellId>(),
            [new MasteryRunSpell(spell, rank)]);
}

[TestClass]
public sealed class SpellMasteryGoalPlannerTests
{
    [TestMethod]
    public void Next_FreshGame_ProvidesThreeActionableLineageGoals()
    {
        var goals = SpellMasteryGoalPlanner.Next(new SpellMasteryState());

        Assert.AreEqual(3, goals.Count);
        Assert.AreEqual(3, goals.Select(goal => goal.Spell).Distinct().Count());
        Assert.IsTrue(goals.All(goal => goal.Objective.Contains("Rank II", StringComparison.Ordinal)));
    }

    [TestMethod]
    public void Next_UnlockedLineage_DoesNotRepeatCompletedGoal()
    {
        var state = new SpellMasteryState();
        for (var run = 0; run < 4; run++) state.RecordRun(
            new MasteryRunEvidence(1, 3, false, new HashSet<SpellId> { SpellId.FireBolt }, [new MasteryRunSpell(SpellId.FireBolt, 3)]));

        var goals = SpellMasteryGoalPlanner.Next(state, 4);

        Assert.IsFalse(goals.Any(goal => goal.Spell == SpellId.FireBolt));
        Assert.AreEqual(3, goals.Count);
    }
}
