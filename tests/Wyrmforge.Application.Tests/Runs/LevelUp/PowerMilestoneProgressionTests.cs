using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.Refinements;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.LevelUp;

[TestClass]
public sealed class PowerMilestoneProgressionTests
{
    [TestMethod]
    public void RollForProgression_BetweenBreakthroughs_OffersOnlyModestRefinements()
    {
        var build = FireBuild();
        var service = new LevelChoiceService(new FirstRandomSource());
        foreach (var level in new[] { 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19 })
        {
            var choices = service.RollForProgression(build, level, trailReward: false);
            Assert.AreEqual(3, choices.Count, $"Level {level}");
            Assert.IsTrue(choices.All(choice => choice.Kind == LevelChoiceKind.Refinement), $"Level {level}");
        }
    }

    [TestMethod]
    public void RollForProgression_AllMajorLevels_OfferTemporaryPowersAndNeverSpellRanksOrEvolutions()
    {
        var build = FireBuild();
        var service = new LevelChoiceService(new FirstRandomSource());
        foreach (var level in new[] { 5, 10, 15, 20, 25 })
        {
            var choices = service.RollForProgression(build, level, trailReward: false);
            Assert.IsGreaterThanOrEqualTo(2, choices.Count, $"Level {level} should offer a meaningful breakthrough.");
            Assert.IsTrue(choices.All(choice => choice.Kind is LevelChoiceKind.Rune or LevelChoiceKind.SchoolPower),
                $"Level {level}: no spell ranks, evolutions or new-spell cards belong in the Hunt.");
            Assert.IsTrue(choices.All(choice => choice.Id.StartsWith("rune:", StringComparison.Ordinal)
                || choice.Id == "power:Fire"));
            Assert.IsTrue(choices.All(choice => PowerMilestoneProfile.IsMajorChoice(build, choice, level)));
            Assert.AreEqual(1, build.Spells[SpellId.FireBolt], "Only Main Spell can permanently upgrade Fireball.");
        }
    }

    [TestMethod]
    public void RollForProgression_LevelFive_FireAttunementStrengthensOnlyChosenSchoolDuringHunt()
    {
        var build = FireBuild();
        var service = new LevelChoiceService(new FirstRandomSource());
        var choices = service.RollForProgression(build, 5, trailReward: false, count: 50);
        var attunement = choices.Single(choice => choice.Id == "power:Fire");
        Assert.IsFalse(service.ApplyForProgression(build, attunement, 4, trailReward: false));
        Assert.IsFalse(service.ApplyForProgression(build, attunement, 5, trailReward: true));
        Assert.IsTrue(service.ApplyForProgression(build, attunement, 5, trailReward: false));
        Assert.AreEqual(1.1, build.SchoolDamageMultiplier(SpellSchool.Fire), 0.00001);
        Assert.AreEqual(1, build.SchoolDamageMultiplier(SpellSchool.Frost), 0.00001);
        Assert.AreEqual(1, build.Spells[SpellId.FireBolt]);
    }

    [TestMethod]
    public void RollForProgression_OldSpellAndEvolutionCards_RejectEvenWhenSubmittedDirectly()
    {
        var build = FireBuild();
        var service = new LevelChoiceService(new FirstRandomSource());
        var illegal = new[]
        {
            new LevelChoice("spell:FireBolt", LevelChoiceKind.SpellUpgrade, "Fireball II", "", "", 1, 3),
            new LevelChoice("spell:FrostShard", LevelChoiceKind.NewSpell, "Frost Shard", "", "", 0, 3),
            new LevelChoice("evolution:Inferno", LevelChoiceKind.Evolution, "Inferno", "", "", 0, 1),
            new LevelChoice("synergy:Frostfire", LevelChoiceKind.Synergy, "Frostfire", "", "", 0, 1),
        };
        foreach (var level in new[] { 5, 10, 15 })
            foreach (var choice in illegal)
                Assert.IsFalse(service.ApplyForProgression(build, choice, level, trailReward: false), $"{choice.Id} at level {level}");
        Assert.AreEqual(1, build.Spells[SpellId.FireBolt]);
        Assert.AreEqual(0, build.Spells[SpellId.FrostShard]);
        Assert.IsNull(build.Evolutions.For(SpellId.FireBolt));
    }

    [TestMethod]
    public void RollForProgression_TrailAttunement_NeverGrantsAFreeMilestone()
    {
        var build = FireBuild();
        var service = new LevelChoiceService(new FirstRandomSource());
        var major = service.RollForProgression(build, 5, trailReward: false)[0];
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
    public void GainExperience_ActualHunt_LevelsTwoToFifteenNeverOfferSpellRankCards()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        typeof(RunSimulation).GetMethod("GainExperience", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, [4000]);
        for (var attempts = 0; simulation.Level < 15 && attempts < 60; attempts++)
        {
            var choices = simulation.PendingChoices;
            Assert.IsGreaterThan(0, choices.Count, $"No reward at level {simulation.Level + 1}");
            var nextLevel = simulation.Level + 1;
            Assert.IsTrue(choices.All(choice => nextLevel % 5 == 0
                ? choice.Kind is LevelChoiceKind.Rune or LevelChoiceKind.SchoolPower
                : choice.Kind == LevelChoiceKind.Refinement), $"Incorrect Hunt reward at level {nextLevel}");
            Assert.IsFalse(choices.Any(choice => choice.Id.StartsWith("spell:", StringComparison.Ordinal)
                || choice.Id.StartsWith("evolution:", StringComparison.Ordinal)));
            Assert.IsTrue(simulation.ApplyChoice(choices[0].Id));
            Assert.AreEqual(1, simulation.CreateSnapshot().Hud.Spells.Single().Rank,
                "Permanent spell ranks cannot be earned from in-hunt reward cards.");
        }
        Assert.AreEqual(15, simulation.Level);
        Assert.IsNull(simulation.CreateSnapshot().Hud.Spells.Single().EvolutionName);
    }

    private static RunBuildState FireBuild()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.TryChoosePrimary(SpellId.FireBolt));
        return build;
    }
}
