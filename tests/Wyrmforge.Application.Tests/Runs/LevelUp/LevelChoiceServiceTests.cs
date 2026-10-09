using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Application.Runs.Rewards;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Application.Tests.Runs.LevelUp;

[TestClass]
public sealed class LevelChoiceServiceTests
{
    [TestMethod]
    public void Roll_WhenStarterSpellIsKnown_ReturnsStructuredThreeDirectionDraft()
    {
        var service = new LevelChoiceService(new FirstRandomSource());

        var choices = service.Roll(new RunBuildState());

        Assert.AreEqual(3, choices.Count);
        CollectionAssert.AreEquivalent(
            new[] { LevelChoiceDraftRole.Reinforce, LevelChoiceDraftRole.Converge, LevelChoiceDraftRole.Venture },
            choices.Select(choice => choice.Role).ToArray());
        Assert.IsTrue(choices.Any(choice => choice.Kind == LevelChoiceKind.NewSpell));
    }

    [TestMethod]
    public void Roll_WhenSynergyBecomesAvailable_UsesConvergeSlotForSynergy()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.FireBolt));
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.FrostShard));
        var service = new LevelChoiceService(new FirstRandomSource());

        var converge = service.Roll(build).Single(choice => choice.Role == LevelChoiceDraftRole.Converge);

        Assert.AreEqual(LevelChoiceKind.Synergy, converge.Kind);
        Assert.AreEqual("Frostfire", converge.Name);
        Assert.AreEqual(RewardRarity.Legendary, converge.Rarity);
    }

    [TestMethod]
    public void Roll_WhenSpellWouldCompleteSynergy_AddsConvergenceHint()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.FrostShard));
        var service = new LevelChoiceService(new FirstRandomSource());

        var converge = service.Roll(build).Single(choice => choice.Role == LevelChoiceDraftRole.Converge);

        Assert.AreEqual($"spell:{SpellId.FireBolt}", converge.Id);
        StringAssert.Contains(converge.Hint!, "Frostfire");
    }

    [TestMethod]
    public void Roll_WithPreferredSchool_UsesConvergeSlotForMatchingSpellChoice()
    {
        var service = new LevelChoiceService(new FirstRandomSource());

        var converge = service.Roll(new RunBuildState(), SpellSchool.Storm).Single(choice => choice.Role == LevelChoiceDraftRole.Converge);

        Assert.IsTrue(converge.Id.StartsWith("spell:", StringComparison.Ordinal));
        Assert.AreEqual(SpellSchool.Storm, SpellCatalog.Get(Enum.Parse<SpellId>(converge.Id[6..])).School);
        StringAssert.Contains(converge.Hint!, "Route attunement");
    }

    [TestMethod]
    public void Roll_WithStrongResonance_SoftlyBiasesSingleChoiceTowardMatchingSpell()
    {
        var build = new RunBuildState();
        var neutralService = new LevelChoiceService(new FixedRandomSource(0.25));
        var resonantService = new LevelChoiceService(new FixedRandomSource(0.25));
        RunResonanceEntry[] resonance = [new(SpellSchool.Storm, 20)];

        var neutral = neutralService.Roll(build, count: 1);
        var resonant = resonantService.Roll(build, resonance, count: 1);
        var neutralSchool = SpellCatalog.Get(Enum.Parse<SpellId>(neutral[0].Id[6..])).School;
        var resonantSchool = SpellCatalog.Get(Enum.Parse<SpellId>(resonant[0].Id[6..])).School;

        Assert.AreNotEqual(SpellSchool.Storm, neutralSchool);
        Assert.AreEqual(SpellSchool.Storm, resonantSchool);
    }

    [TestMethod]
    public void Roll_VentureSlot_PrefersSpellFromUnrepresentedSchool()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.FireBolt));
        var service = new LevelChoiceService(new FirstRandomSource());

        var venture = service.Roll(build).Single(choice => choice.Role == LevelChoiceDraftRole.Venture);

        Assert.AreEqual(LevelChoiceKind.NewSpell, venture.Kind);
        var school = SpellCatalog.Get(Enum.Parse<SpellId>(venture.Id[6..])).School;
        Assert.IsTrue(school is SpellSchool.Frost or SpellSchool.Storm);
        StringAssert.Contains(venture.Hint!, "Pivot");
    }

    [TestMethod]
    public void Roll_WithForgeContentPool_NeverOffersLockedSpell()
    {
        HashSet<SpellId> available = [SpellId.ArcaneOrb, SpellId.FireBolt, SpellId.FrostShard, SpellId.ChainLightning];
        var service = new LevelChoiceService(new FirstRandomSource(), available);

        var choices = service.Roll(new RunBuildState(), count: 20);
        var spellIds = choices
            .Where(choice => choice.Id.StartsWith("spell:", StringComparison.Ordinal))
            .Select(choice => Enum.Parse<SpellId>(choice.Id[6..]))
            .ToArray();

        Assert.IsTrue(spellIds.Length > 0);
        Assert.IsTrue(spellIds.All(available.Contains));
        Assert.IsFalse(spellIds.Contains(SpellId.CinderNeedle));
    }

    [TestMethod]
    public void Roll_WhenSpellUpgradeWouldReachMastery_AssignsRareRarity()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.ArcaneOrb));
        var service = new LevelChoiceService(new FirstRandomSource());

        var choices = service.Roll(build, count: 20);
        var arcaneOrb = choices.Single(choice => choice.Id == $"spell:{SpellId.ArcaneOrb}");

        Assert.AreEqual(LevelChoiceKind.SpellUpgrade, arcaneOrb.Kind);
        Assert.AreEqual(RewardRarity.Rare, arcaneOrb.Rarity);
    }

    [TestMethod]
    public void CreateEvolutionDraft_WhenSpellIsMastered_ReturnsTwoBranches()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.ArcaneOrb));
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.ArcaneOrb));
        var service = new LevelChoiceService(new FirstRandomSource());

        var choices = service.CreateEvolutionDraft(build, SpellId.ArcaneOrb);

        Assert.AreEqual(2, choices.Count);
        Assert.IsTrue(choices.All(choice => choice.Kind == LevelChoiceKind.Evolution));
        Assert.IsTrue(choices.All(choice => choice.Rarity == RewardRarity.Legendary));
        CollectionAssert.AreEquivalent(
            new[] { $"evolution:{SpellEvolutionId.RiftSpear}", $"evolution:{SpellEvolutionId.StarSwarm}" },
            choices.Select(choice => choice.Id).ToArray());
    }

    [TestMethod]
    public void Apply_EvolutionChoice_SelectsOneBranchAndClosesOtherBranch()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.ArcaneOrb));
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.ArcaneOrb));
        var service = new LevelChoiceService(new FirstRandomSource());
        var choices = service.CreateEvolutionDraft(build, SpellId.ArcaneOrb);

        Assert.IsTrue(service.Apply(build, choices[0]));
        Assert.AreEqual(SpellEvolutionId.RiftSpear, build.Evolutions.For(SpellId.ArcaneOrb));
        Assert.AreEqual(0, service.CreateEvolutionDraft(build, SpellId.ArcaneOrb).Count);
        Assert.IsFalse(service.Apply(build, choices[1]));
    }

    [TestMethod]
    public void CreateEvolutionDraft_WhenBlueprintLocked_ExcludesThirdBranch()
    {
        var build = new RunBuildState();
        for (var rank = 0; rank < 3; rank++) Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.CinderNeedle));
        var available = SpellEvolutionCatalog.Base.Select(evolution => evolution.Id).ToHashSet();
        var service = new LevelChoiceService(new FirstRandomSource(), availableEvolutions: available);

        var draft = service.CreateEvolutionDraft(build, SpellId.CinderNeedle);

        Assert.AreEqual(2, draft.Count);
        Assert.IsFalse(draft.Any(choice => choice.Id == $"evolution:{SpellEvolutionId.EmberTempest}"));
    }

    [TestMethod]
    public void CreateEvolutionDraft_AfterBlueprintUnlocked_AddsThirdBranch()
    {
        var build = new RunBuildState();
        for (var rank = 0; rank < 3; rank++) Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.CinderNeedle));
        var available = SpellEvolutionCatalog.All.Select(evolution => evolution.Id).ToHashSet();
        var service = new LevelChoiceService(new FirstRandomSource(), availableEvolutions: available);

        var draft = service.CreateEvolutionDraft(build, SpellId.CinderNeedle);

        Assert.AreEqual(3, draft.Count);
        Assert.IsTrue(draft.Any(choice => choice.Id == $"evolution:{SpellEvolutionId.EmberTempest}"));
    }

    [TestMethod]
    [DataRow(1)]
    [DataRow(3)]
    public void Roll_ReadySynergyAndRouteAttunement_AlwaysIncludesChosenSchool(int count)
    {
        var build = new RunBuildState();
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        build.Spells.LearnOrUpgrade(SpellId.FrostShard);
        var service = new LevelChoiceService(new FirstRandomSource());
        var choices = service.Roll(build, SpellSchool.Storm, count);
        Assert.IsTrue(choices.Any(choice => choice.Id.StartsWith("spell:", StringComparison.Ordinal)
            && SpellCatalog.Get(Enum.Parse<SpellId>(choice.Id[6..])).School == SpellSchool.Storm));
        Assert.AreEqual(count, choices.Count);
    }

    [TestMethod]
    public void Roll_AllSchoolUpgradesMaxed_OffersSchoolDamageInsteadOfUnrelatedReward()
    {
        var build = new RunBuildState();
        foreach (var spell in SpellCatalog.All.Where(spell => spell.School == SpellSchool.Fire))
            for (var rank = 0; rank < spell.MaxRank; rank++) build.Spells.LearnOrUpgrade(spell.Id);
        while (build.RunUpgrades.Apply(Wyrmforge.Domain.Progression.RunUpgrades.RunUpgradeId.Emberbrand)) { }
        var service = new LevelChoiceService(new FirstRandomSource());
        var choice = service.Roll(build, SpellSchool.Fire, 1).Single();
        Assert.AreEqual(LevelChoiceKind.SchoolPower, choice.Kind);
        Assert.IsTrue(service.Apply(build, choice));
        Assert.AreEqual(1.1, build.SchoolDamageMultiplier(SpellSchool.Fire), 0.001);
        Assert.AreEqual(1, build.SchoolDamageMultiplier(SpellSchool.Frost));
    }

    [TestMethod]
    public void Roll_FirstTwoDrafts_OfferImmediateReinforcementAndPreserveRouteSchool()
    {
        foreach (var school in Enum.GetValues<SpellSchool>())
        {
            for (var sample = 0; sample < 50; sample++)
            {
                var service = new LevelChoiceService(new FixedRandomSource(sample / 50d), new HashSet<SpellId>
                    { SpellId.ArcaneOrb, SpellId.FireBolt, SpellId.FrostShard, SpellId.ChainLightning });
                var build = new RunBuildState();
                for (var draft = 0; draft < 2; draft++)
                {
                    var choices = service.Roll(build, school);
                    var reinforce = choices.Single(choice => choice.Role == LevelChoiceDraftRole.Reinforce);
                    Assert.IsTrue(reinforce.Kind == LevelChoiceKind.SpellUpgrade || reinforce.Id is "rune:Potency" or "rune:Quickening");
                    Assert.AreEqual(3, choices.Select(choice => choice.Id).Distinct().Count());
                    Assert.IsTrue(choices.Any(choice => choice.Id.StartsWith("spell:", StringComparison.Ordinal)
                        && SpellCatalog.Get(Enum.Parse<SpellId>(choice.Id[6..])).School == school));
                    Assert.IsFalse(choices.Any(choice => choice.Id is "spell:AetherDart" or "spell:CinderNeedle" or "spell:IceLance" or "spell:BallLightning"));
                    Assert.IsTrue(service.Apply(build, reinforce));
                }
            }
        }
    }

    [TestMethod]
    public void Roll_AfterTwoDrafts_ReturnsUtilityRunesToReinforcePool()
    {
        var service = new LevelChoiceService(new FirstRandomSource());
        var build = new RunBuildState();
        for (var draft = 0; draft < 2; draft++) service.Roll(build, SpellSchool.Arcane);
        var seen = new HashSet<string>();
        for (var draft = 0; draft < 30; draft++)
        {
            var choices = service.Roll(build, SpellSchool.Arcane);
            seen.Add(choices.Single(choice => choice.Role == LevelChoiceDraftRole.Reinforce).Id);
            foreach (var choice in choices.Where(choice => choice.Kind == LevelChoiceKind.Rune)) service.Apply(build, choice);
        }
        Assert.IsTrue(seen.Any(id => id is "rune:Velocity" or "rune:Fleetfoot" or "rune:Vitality" or "rune:Bulwark"));
    }

    private sealed class FixedRandomSource(double value) : IRandomSource
    {
        public int Next(int exclusiveMax) => 0;
        public double NextDouble() => value;
    }
}
