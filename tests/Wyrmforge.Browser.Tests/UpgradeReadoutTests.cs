using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Presentation.Web.Features.LevelUp;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class UpgradeReadoutTests
{
    [TestMethod]
    public void Delta_ArcaneRankTwo_LeadsWithPierceAndRankThreeDoesNotClaimAnotherPierce()
    {
        StringAssert.StartsWith(LevelChoicePresentation.Delta(Choice(SpellId.ArcaneOrb, 1)), "Pierce +1");
        var next = LevelChoicePresentation.Delta(Choice(SpellId.ArcaneOrb, 2));
        StringAssert.StartsWith(next, "Wider bolt");
        Assert.IsFalse(next.Contains("Pierce", StringComparison.Ordinal));
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

    private static LevelChoice Choice(SpellId id, int rank)
    {
        var spell = SpellCatalog.Get(id);
        return new LevelChoice($"spell:{id}", rank == 0 ? LevelChoiceKind.NewSpell : LevelChoiceKind.SpellUpgrade,
            spell.Name, spell.Description, spell.Icon, rank, spell.MaxRank);
    }
}
