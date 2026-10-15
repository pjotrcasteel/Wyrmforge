using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Presentation.Web.Features.LevelUp;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class UpgradeReadoutTests
{
    [TestMethod]
    public void Delta_ArcaneRanks_DescribeDeeperPiercingAndWiderMastery()
    {
        StringAssert.StartsWith(LevelChoicePresentation.Delta(Choice(SpellId.ArcaneOrb, 1)), "Pierce +1");
        var next = LevelChoicePresentation.Delta(Choice(SpellId.ArcaneOrb, 2));
        StringAssert.StartsWith(next, "Wider bolt");
        StringAssert.Contains(next, "Pierce +1");
    }

    [TestMethod]
    public void Delta_FrostNewSpell_NamesFreezeDurationFromItsActualProfile()
    {
        var duration = SpellCatalog.Get(SpellId.FrostShard).Ability.Status!.CalculateDurationSeconds(1);
        StringAssert.StartsWith(LevelChoicePresentation.Delta(Choice(SpellId.FrostShard, 0)), $"Freeze {duration:0.00}s");
        StringAssert.StartsWith(LevelChoicePresentation.Delta(Choice(SpellId.FrostShard, 2)), "Freezing nova");
    }

    [TestMethod]
    public void Delta_MasteryRanks_NameTheirNewCombatBehaviour()
    {
        StringAssert.StartsWith(LevelChoicePresentation.Delta(Choice(SpellId.FireBolt, 2)), "Impact blast");
        StringAssert.StartsWith(LevelChoicePresentation.Delta(Choice(SpellId.ChainLightning, 2)), "Forked lightning");
    }

    [TestMethod]
    public void Rank_LegacyFocusChoice_DoesNotClaimAnotherRank()
    {
        var choice = new LevelChoice("focus:FireBolt", LevelChoiceKind.SpellFocus, "Focus Fire Bolt", "Replaces primary", "fire", 3, 3);
        Assert.AreEqual("PRIMARY FOCUS", LevelChoicePresentation.Badge(choice));
        Assert.AreEqual("KNOWN RANK III", LevelChoicePresentation.Rank(choice));
        Assert.AreEqual("Replaces primary", LevelChoicePresentation.Delta(choice));
    }

    [TestMethod]
    public void Footer_LegacyNewSpell_DoesNotPromiseReplacingCommittedPrimary()
    {
        var choice = Choice(SpellId.FireBolt, 0);
        Assert.AreEqual("SUPPORT MAGIC", LevelChoicePresentation.Badge(choice));
        StringAssert.Contains(LevelChoicePresentation.Footer(choice), "NO MID-RUN PIVOT");
    }


    [TestMethod]
    public void Delta_FireUpgrades_DisplaysFocusedDamageAndGrowingBlast()
    {
        var rankTwo = LevelChoicePresentation.Delta(Choice(SpellId.FireBolt, 1));
        var rankThree = LevelChoicePresentation.Delta(Choice(SpellId.FireBolt, 2));

        StringAssert.StartsWith(rankTwo, "Impact blast 32");
        StringAssert.StartsWith(rankThree, "Impact blast 84");
        StringAssert.Contains(rankThree, $"{86.4:0.#} damage");
        StringAssert.Contains(LevelChoicePresentation.Footer(new LevelChoice("synergy:Frostfire", LevelChoiceKind.Synergy, "", "", "", 0, 1)), "KEEPS PRIMARY");
    }

    private static LevelChoice Choice(SpellId id, int rank)
    {
        var spell = SpellCatalog.Get(id);
        return new LevelChoice($"spell:{id}", rank == 0 ? LevelChoiceKind.NewSpell : LevelChoiceKind.SpellUpgrade,
            spell.Name, spell.Description, spell.Icon, rank, spell.MaxRank);
    }
}
