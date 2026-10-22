using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Presentation.Web.Features.LevelUp;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class HuntUpgradeCardPresentationTests
{
    [TestMethod]
    public void RuneCard_FirstTemporaryPower_HasNoLegacySpellRankLanguage()
    {
        var choice = new LevelChoice("rune:Emberbrand", LevelChoiceKind.Rune, "Emberbrand",
            "Burn enemies during this hunt.", "♨", 0, 2);

        Assert.AreEqual("NEW HUNT POWER", LevelChoicePresentation.Rank(choice));
        Assert.AreEqual("MAJOR RUNE", LevelChoicePresentation.Badge(choice));
        Assert.AreEqual("MAJOR • THIS RUN ONLY", LevelChoicePresentation.Footer(choice));
    }

    [TestMethod]
    public void RuneCard_SecondTemporaryRank_RemainsExplicitlyHuntOnly()
    {
        var choice = new LevelChoice("rune:Emberbrand", LevelChoiceKind.Rune, "Emberbrand",
            "Burn enemies during this hunt.", "♨", 1, 2);

        Assert.AreEqual("HUNT POWER 2/2", LevelChoicePresentation.Rank(choice));
        Assert.IsFalse(LevelChoicePresentation.Rank(choice).Contains("III", StringComparison.Ordinal));
    }

    [TestMethod]
    public void MinorRefinement_UsesSmallBoostLanguageRatherThanFireballRanks()
    {
        var choice = new LevelChoice("refine:Force", LevelChoiceKind.Refinement, "Force",
            "Small temporary damage boost.", "✦", 1, 5);

        Assert.AreEqual("SMALL BOOST 2/5", LevelChoicePresentation.Rank(choice));
        Assert.AreEqual("REFINEMENT", LevelChoicePresentation.Badge(choice));
        Assert.AreEqual("MINOR • BUILDS TOWARD YOUR NEXT BREAKTHROUGH", LevelChoicePresentation.Footer(choice));
    }

    [TestMethod]
    public void FireAttunement_ShowsTemporaryCurrentSchoolPower()
    {
        var choice = new LevelChoice("power:Fire", LevelChoiceKind.SchoolPower,
            "Fire Attunement", "+10% Fire spell damage during this hunt.", "✦", 0, int.MaxValue);

        Assert.AreEqual("+10% SCHOOL DAMAGE", LevelChoicePresentation.Rank(choice));
        Assert.AreEqual("ATTUNEMENT", LevelChoicePresentation.Badge(choice));
        Assert.AreEqual("MAJOR • THIS RUN ONLY", LevelChoicePresentation.Footer(choice));
    }

    [TestMethod]
    public void ActualFireHuntDraft_UsesOnlyNewCardPresentation()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.TryChoosePrimary(SpellId.FireBolt));
        var service = new LevelChoiceService(new FirstRandomSource());
        var normal = service.RollForProgression(build, rewardLevel: 4, trailReward: false);
        var major = service.RollForProgression(build, rewardLevel: 5, trailReward: false);

        Assert.IsTrue(normal.All(choice => LevelChoicePresentation.Rank(choice).StartsWith("SMALL BOOST", StringComparison.Ordinal)));
        Assert.IsTrue(major.All(choice => LevelChoicePresentation.Rank(choice).Contains("HUNT", StringComparison.Ordinal)
            || choice.Kind == LevelChoiceKind.SchoolPower));
        Assert.IsFalse(major.Any(choice => choice.Kind is LevelChoiceKind.SpellUpgrade or LevelChoiceKind.Evolution
            or LevelChoiceKind.NewSpell));
    }
    private sealed class FirstRandomSource : IRandomSource
    {
        public int Next(int exclusiveMax) => 0;
        public double NextDouble() => 0;
    }
}
