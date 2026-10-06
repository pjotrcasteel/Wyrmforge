using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Application.Runs.Rewards;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Spells;

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

    private sealed class FixedRandomSource(double value) : IRandomSource
    {
        public int Next(int exclusiveMax) => 0;
        public double NextDouble() => value;
    }
}
