using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Chronicles;
using Wyrmforge.Domain.Chronicles;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.Legacy;

namespace Wyrmforge.Application.Tests.Chronicles;

[TestClass]
public sealed class AdvancedAccessTests
{
    private static readonly HashSet<DragonId> AllLineages = WyrmLineageCatalog.All.Select(lineage => lineage.Wyrm).ToHashSet();
    private static readonly HashSet<DragonId> OneAscendant = [AllLineages.First()];

    [TestMethod]
    public void BookOneOpensTheCampaignRoad()
    {
        var progress = AdvancedAccess.Evaluate(new(true, 1, new HashSet<DragonId>(), new HashSet<DragonId>()));
        Assert.AreEqual(AdvancementRoute.Campaign, progress.Route);
    }

    [TestMethod]
    public void TheExplorationRoadNeedsEveryCondition()
    {
        Assert.AreEqual(AdvancementRoute.Exploration, AdvancedAccess.Evaluate(new(false, AdvancedAccess.ExplorationHunterLevel, AllLineages, OneAscendant)).Route);
        Assert.AreEqual(AdvancementRoute.None, AdvancedAccess.Evaluate(new(false, AdvancedAccess.ExplorationHunterLevel - 1, AllLineages, OneAscendant)).Route);
        Assert.AreEqual(AdvancementRoute.None, AdvancedAccess.Evaluate(new(false, AdvancedAccess.ExplorationHunterLevel, AllLineages.Skip(1).ToHashSet(), OneAscendant)).Route);
        Assert.AreEqual(AdvancementRoute.None, AdvancedAccess.Evaluate(new(false, AdvancedAccess.ExplorationHunterLevel, AllLineages, new HashSet<DragonId>())).Route);
    }

    [TestMethod]
    public void SkippingTheCampaignNeverSkipsTheClimb()
    {
        var fresh = AdvancedAccess.Evaluate(new(false, 1, new HashSet<DragonId>(), new HashSet<DragonId>()));
        Assert.IsFalse(fresh.Unlocked);
        Assert.AreEqual(0, fresh.LineagesSlain);
    }

    [TestMethod]
    public void AccessIsClaimedOnceAndNeverRelocks()
    {
        var ledger = new OneTimeGrantLedger();
        var earned = new AdvancementFacts(false, AdvancedAccess.ExplorationHunterLevel, AllLineages, OneAscendant);
        Assert.IsTrue(AdvancedAccess.TryUnlock(ledger, earned));
        Assert.IsFalse(AdvancedAccess.TryUnlock(ledger, earned), "A second claim pays nothing.");
        Assert.IsFalse(AdvancedAccess.TryUnlock(ledger, new(false, 1, new HashSet<DragonId>(), new HashSet<DragonId>())));
        Assert.IsTrue(AdvancedAccess.IsUnlocked(ledger));
    }

    [TestMethod]
    public void BookOneCompletionIsReadFromTheGrantLedger()
    {
        var ledger = new OneTimeGrantLedger();
        Assert.IsFalse(AdvancedAccess.BookOneCompleted(ledger));
        ledger.TryClaim(LegacyGrants.FirstCompletion(StoryBookCatalog.BrokenCovenant.Id));
        Assert.IsTrue(AdvancedAccess.BookOneCompleted(ledger));
    }
}
