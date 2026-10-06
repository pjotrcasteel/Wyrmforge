using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.LevelUp;

[TestClass]
public sealed class LevelChoiceServiceTests
{
    [TestMethod]
    public void Roll_WhenOnlyStarterSpellIsKnown_OffersNewSpell()
    {
        var service = new LevelChoiceService(new FirstRandomSource());
        var choices = service.Roll(new RunBuildState());

        Assert.AreEqual(3, choices.Count);
        Assert.IsTrue(choices.Any(choice => choice.Kind == LevelChoiceKind.NewSpell));
    }

    [TestMethod]
    public void Roll_WhenSynergyBecomesAvailable_SurfacesSynergyFirst()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.FireBolt));
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.FrostShard));
        var service = new LevelChoiceService(new FirstRandomSource());

        var choices = service.Roll(build);

        Assert.AreEqual(LevelChoiceKind.Synergy, choices[0].Kind);
        Assert.AreEqual("Frostfire", choices[0].Name);
    }

    [TestMethod]
    public void Roll_WithPreferredSchool_GuaranteesMatchingSpellChoice()
    {
        var service = new LevelChoiceService(new FirstRandomSource());

        var choices = service.Roll(new RunBuildState(), SpellSchool.Storm);

        Assert.IsTrue(choices.Any(choice => choice.Id.StartsWith("spell:", StringComparison.Ordinal)
            && SpellCatalog.Get(Enum.Parse<SpellId>(choice.Id[6..])).School == SpellSchool.Storm));
    }

    [TestMethod]
    public void Roll_WithStrongResonance_SoftlyBiasesMatchingSpellChoice()
    {
        var build = new RunBuildState();
        var neutralService = new LevelChoiceService(new FixedRandomSource(0.6));
        var resonantService = new LevelChoiceService(new FixedRandomSource(0.6));
        RunResonanceEntry[] resonance = [new(SpellSchool.Storm, 20)];

        var neutral = neutralService.Roll(build, count: 1);
        var resonant = resonantService.Roll(build, resonance, count: 1);
        var neutralSchool = SpellCatalog.Get(Enum.Parse<SpellId>(neutral[0].Id[6..])).School;
        var resonantSchool = SpellCatalog.Get(Enum.Parse<SpellId>(resonant[0].Id[6..])).School;

        Assert.AreNotEqual(SpellSchool.Storm, neutralSchool);
        Assert.AreEqual(SpellSchool.Storm, resonantSchool);
    }

    private sealed class FixedRandomSource(double value) : IRandomSource
    {
        public int Next(int exclusiveMax) => 0;
        public double NextDouble() => value;
    }
}
