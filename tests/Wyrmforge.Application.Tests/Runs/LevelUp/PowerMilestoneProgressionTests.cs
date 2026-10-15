using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.Refinements;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Application.Tests.Runs.LevelUp;

[TestClass]
public sealed class PowerMilestoneProgressionTests
{
    [TestMethod]
    public void RollForProgression_LevelsTwoToFour_OfferOnlyModestRefinements()
    {
        var build = FireBuild();
        var service = new LevelChoiceService(new FirstRandomSource());
        foreach (var level in new[] { 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14 })
        {
            var choices = service.RollForProgression(build, level, trailReward: false);
            Assert.AreEqual(3, choices.Count, $"level {level}");
            Assert.IsTrue(choices.All(choice => choice.Kind == LevelChoiceKind.Refinement), $"level {level}");
            Assert.IsFalse(choices.Any(choice => choice.Id.StartsWith("spell:", StringComparison.Ordinal)));
        }
    }

    [TestMethod]
    public void RollForProgression_LevelFiveAndTen_GuaranteeAvailablePrimaryRank()
    {
        var build = FireBuild();
        var service = new LevelChoiceService(new FirstRandomSource());
        var levelFive = service.RollForProgression(build, 5, trailReward: false);
        var spell = levelFive.Single(choice => choice.Id == "spell:FireBolt");
        Assert.IsTrue(levelFive.All(choice => choice.Kind is LevelChoiceKind.SpellUpgrade or LevelChoiceKind.Rune));
        Assert.IsFalse(service.ApplyForProgression(build, spell, 4, trailReward: false));
        Assert.AreEqual(1, build.Spells[SpellId.FireBolt]);
        Assert.IsTrue(service.ApplyForProgression(build, spell, 5, trailReward: false));
        Assert.AreEqual(2, build.Spells[SpellId.FireBolt]);
        Assert.AreEqual(SpellId.FireBolt, build.Spells.ActiveSpell);

        var levelTen = service.RollForProgression(build, 10, trailReward: false);
        Assert.IsTrue(levelTen.Any(choice => choice.Id == "spell:FireBolt"));
        Assert.IsTrue(levelTen.Any(choice => choice.Kind == LevelChoiceKind.Synergy));
        var rankThree = levelTen.Single(choice => choice.Id == "spell:FireBolt");
        Assert.IsFalse(service.ApplyForProgression(build, rankThree, 9, trailReward: false));
        Assert.IsTrue(service.ApplyForProgression(build, rankThree, 10, trailReward: false));
        Assert.AreEqual(3, build.Spells[SpellId.FireBolt]);
        Assert.IsFalse(levelTen.Any(choice => choice.Kind == LevelChoiceKind.Evolution));
    }

    [TestMethod]
    public void RollForProgression_LevelFifteen_OffersActualEvolutionWithoutFreeEarlyDraft()
    {
        var build = FireBuild();
        var service = new LevelChoiceService(new FirstRandomSource());
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.FireBolt));
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.FireBolt));
        Assert.IsTrue(service.RollForProgression(build, 14, trailReward: false)
            .All(choice => choice.Kind == LevelChoiceKind.Refinement));
        var evolved = service.RollForProgression(build, 15, trailReward: false);
        Assert.IsGreaterThanOrEqualTo(2, evolved.Count);
        Assert.IsTrue(evolved.All(choice => choice.Kind == LevelChoiceKind.Evolution));
        Assert.IsFalse(service.ApplyForProgression(build, evolved[0], 14, trailReward: false));
        Assert.IsTrue(service.ApplyForProgression(build, evolved[0], 15, trailReward: false));
        Assert.IsNotNull(build.Evolutions.For(SpellId.FireBolt));
        Assert.IsFalse(service.ApplyForProgression(build, evolved[1], 15, trailReward: false));
    }

    [TestMethod]
    public void RollForProgression_TrailAttunement_OnlyRefinesAndCannotGrantMilestone()
    {
        var build = FireBuild();
        var service = new LevelChoiceService(new FirstRandomSource());
        var major = service.RollForProgression(build, 5, trailReward: false).Single(choice => choice.Id == "spell:FireBolt");
        var trail = service.RollForProgression(build, 5, trailReward: true, SpellSchool.Storm);
        Assert.IsTrue(trail.All(choice => choice.Kind == LevelChoiceKind.Refinement));
        Assert.IsFalse(service.ApplyForProgression(build, major, 5, trailReward: true));
        Assert.IsTrue(service.ApplyForProgression(build, trail[0], 5, trailReward: true));
        Assert.AreEqual(1, build.Spells[SpellId.FireBolt]);
    }

    [TestMethod]
    public void Refinements_ApplySmallCumulativeBonuses_WithoutChangingPrimary()
    {
        var build = FireBuild();
        var service = new LevelChoiceService(new FirstRandomSource());
        var first = service.RollForProgression(build, 2, trailReward: false, count: 5);
        var force = first.Single(choice => choice.Id == "refine:Force");
        var rhythm = first.Single(choice => choice.Id == "refine:Rhythm");
        Assert.IsTrue(service.ApplyForProgression(build, force, 2, trailReward: false));
        Assert.IsTrue(service.ApplyForProgression(build, rhythm, 2, trailReward: false));
        Assert.AreEqual(1, build.Refinements[RunRefinementId.Force]);
        Assert.AreEqual(1, build.Refinements[RunRefinementId.Rhythm]);
        var modifiers = BuildModifierSet.Aggregate([
            RunRefinementCatalog.Get(RunRefinementId.Force).ProfileForRank(build.Refinements[RunRefinementId.Force]),
            RunRefinementCatalog.Get(RunRefinementId.Rhythm).ProfileForRank(build.Refinements[RunRefinementId.Rhythm]),
        ]);
        Assert.AreEqual(106, modifiers.Apply(BuildStatId.Damage, 100), 0.001);
        Assert.AreEqual(0.96, modifiers.Apply(BuildStatId.CastInterval, 1), 0.001);
        Assert.AreEqual(SpellId.FireBolt, build.Spells.ActiveSpell);
    }

    [TestMethod]
    public void GainExperience_ActualSimulation_GrantsRankAtFiveAndTenThenEvolutionAtFifteen()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        typeof(RunSimulation).GetMethod("GainExperience", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, [4000]);
        for (var choiceCount = 0; simulation.Level < 15 && choiceCount < 60; choiceCount++)
        {
            var choices = simulation.PendingChoices;
            Assert.IsGreaterThan(0, choices.Count, $"No rewards were offered at level {simulation.Level + 1}");
            var nextLevel = simulation.Level + 1;
            if (nextLevel is 5 or 10)
            {
                Assert.IsTrue(choices.Any(choice => choice.Id == "spell:FireBolt"));
                Assert.IsTrue(simulation.ApplyChoice("spell:FireBolt"));
                Assert.AreEqual(nextLevel == 5 ? 2 : 3, simulation.CreateSnapshot().Hud.Spells.Single().Rank);
            }
            else if (nextLevel == 15)
            {
                Assert.IsTrue(choices.All(choice => choice.Kind == LevelChoiceKind.Evolution));
                Assert.IsTrue(simulation.ApplyChoice(choices[0].Id));
            }
            else
            {
                Assert.IsTrue(choices.All(choice => choice.Kind == LevelChoiceKind.Refinement));
                Assert.IsTrue(simulation.ApplyChoice(choices[0].Id));
            }
        }
        Assert.AreEqual(15, simulation.Level);
        Assert.IsTrue(simulation.CreateSnapshot().Hud.Spells.Single().EvolutionName is not null);
    }

    private static RunBuildState FireBuild()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.TryChoosePrimary(SpellId.FireBolt));
        return build;
    }
}
