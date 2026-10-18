using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Chronicles;
using Wyrmforge.Domain.Progression.Legacy;

namespace Wyrmforge.Domain.Tests.Chronicles;

[TestClass]
public sealed class ChronicleTests
{
    private static readonly StoryBookDefinition Playable = StoryBookCatalog.BrokenCovenant with { Status = StoryBookStatus.Playable };
    private static StoryBookDefinition? Books(StoryId id) => id == Playable.Id ? Playable : null;

    [TestMethod]
    public void BookOneFollowsTheHandoverOutline()
    {
        var book = StoryBookCatalog.BrokenCovenant;
        Assert.AreEqual(StoryBookStatus.InPreparation, book.Status);
        Assert.HasCount(4, book.Segments);
        Assert.HasCount(3, book.Decisions);
        CollectionAssert.AreEquivalent(new[] { "the-last-bastion", "the-open-roads", "the-unbound-dawn" }, book.Endings.Select(ending => ending.Id.Value).ToArray());
        // The final choice is the ending: every option names one ending and every ending has an option.
        CollectionAssert.AreEquivalent(book.Endings.Select(ending => ending.Id).ToArray(), book.FinalDecision.Options.Select(option => option.Id).ToArray());
        foreach (var decision in book.Decisions) Assert.IsGreaterThanOrEqualTo(0, book.SegmentIndex(decision.Segment));
        Assert.IsTrue(book.Decisions.All(decision => decision.Options.Count >= 2));
    }

    [TestMethod]
    public void ABookInPreparationCannotBeBegun()
    {
        var registry = new ChronicleRegistry();
        Assert.IsNull(registry.Begin(StoryBookCatalog.BrokenCovenant));
        Assert.IsEmpty(registry.Chronicles);
    }

    [TestMethod]
    public void AChronicleWalksItsChaptersAndEndsOnTheFinalChoice()
    {
        var chronicle = new ChronicleRegistry(Books).Begin(Playable)!;
        Assert.IsTrue(chronicle.Advance(), "The prologue asks no choice.");
        Assert.AreEqual(ChronicleDecisionResult.NotReached, chronicle.Decide(new("price-of-knowledge"), new("seal-the-testament")));
        Assert.IsFalse(chronicle.Advance(), "Act I waits for its choice.");
        Assert.AreEqual(ChronicleDecisionResult.UnknownOption, chronicle.Decide(new("cost-of-protection"), new("seal-the-testament")));
        Assert.AreEqual(ChronicleDecisionResult.Recorded, chronicle.Decide(new("cost-of-protection"), new("shield-cindervale")));
        Assert.AreEqual(ChronicleDecisionResult.AlreadyDecided, chronicle.Decide(new("cost-of-protection"), new("reinforce-highward")));
        Assert.IsTrue(chronicle.Advance());
        Assert.AreEqual(ChronicleDecisionResult.Recorded, chronicle.Decide(new("price-of-knowledge"), new("entrust-the-researchers")));
        Assert.IsTrue(chronicle.Advance());
        Assert.IsFalse(chronicle.Completed);
        Assert.AreEqual(ChronicleDecisionResult.Recorded, chronicle.Decide(new("future-of-humanity"), new("the-open-roads")));
        Assert.IsTrue(chronicle.Completed);
        Assert.AreEqual("The Open Roads", chronicle.Ending!.Title);
        Assert.IsFalse(chronicle.Advance());
        Assert.AreEqual(ChronicleDecisionResult.ChronicleComplete, chronicle.Decide(new("future-of-humanity"), new("the-last-bastion")));
    }

    [TestMethod]
    public void BeginningANewChronicleNeverOverwritesAnother()
    {
        var registry = new ChronicleRegistry(Books);
        var first = registry.Begin(Playable)!;
        first.Advance();
        first.Decide(new("cost-of-protection"), new("reinforce-highward"));
        var second = registry.Begin(Playable)!;
        Assert.AreEqual(2, second.Number);
        Assert.AreSame(second, registry.Active);
        Assert.AreEqual(new StoryId("reinforce-highward"), first.ChoiceFor(new("cost-of-protection")));
        Assert.IsNull(second.ChoiceFor(new("cost-of-protection")));
        Assert.IsTrue(registry.Resume(1));
        Assert.AreSame(first, registry.Active);
    }

    [TestMethod]
    public void ARegistryRoundTripsAndDropsWhatItCannotRead()
    {
        var registry = new ChronicleRegistry(Books);
        var chronicle = registry.Begin(Playable)!;
        chronicle.Advance();
        chronicle.Decide(new("cost-of-protection"), new("shield-cindervale"));
        chronicle.Advance();
        var save = registry.Save();
        var tampered = save with
        {
            Chronicles =
            [
                .. save.Chronicles!,
                new ChronicleSave(1, Playable.Id.Value, 1, "prologue", []),
                new ChronicleSave(7, "unknown-book", 1, "prologue", []),
                new ChronicleSave(8, "Not Kebab", 1, "prologue", null),
            ],
        };

        var restored = new ChronicleRegistry(Books);
        restored.Restore(tampered);

        Assert.HasCount(1, restored.Chronicles);
        Assert.AreEqual(1, restored.Active!.Number);
        Assert.AreEqual("the-forbidden-testament", restored.Active.Segment.Id.Value);
        Assert.AreEqual(new StoryId("shield-cindervale"), restored.Active.ChoiceFor(new("cost-of-protection")));
        Assert.AreEqual(2, restored.Begin(Playable)!.Number, "Numbers are never reused.");
    }

    [TestMethod]
    public void ARestoredChapterNeverRunsAheadOfItsChoices()
    {
        var save = new ChronicleSave(1, Playable.Id.Value, 1, "the-hollow-crown", [new("cost-of-protection", "shield-cindervale"), new("unknown-choice", "x")]);
        var chronicle = ChronicleState.Restore(save, Books)!;
        Assert.AreEqual("the-forbidden-testament", chronicle.Segment.Id.Value);
        Assert.HasCount(1, chronicle.Decisions);
    }

    [TestMethod]
    public void AOneTimeGrantPaysOutOnce()
    {
        var ledger = new OneTimeGrantLedger();
        var grant = LegacyGrants.FirstCompletion(StoryBookCatalog.BrokenCovenant.Id);
        Assert.IsTrue(ledger.TryClaim(grant));
        Assert.IsFalse(ledger.TryClaim(grant));

        var restored = new OneTimeGrantLedger();
        restored.Restore([.. ledger.Save(), grant, "Bad Grant", ""]);
        Assert.HasCount(1, restored.Claimed);
        Assert.IsFalse(restored.TryClaim(grant));
        Assert.ThrowsExactly<ArgumentException>(() => restored.TryClaim("Not Kebab"));
    }
}
