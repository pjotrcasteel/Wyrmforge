namespace Wyrmforge.Domain.Chronicles;

public enum ChronicleDecisionResult { Recorded, UnknownDecision, UnknownOption, NotReached, AlreadyDecided, ChronicleComplete }

public sealed record ChronicleDecisionSave(string Decision, string Option);

public sealed record ChronicleSave(int Number, string Book, int BookVersion, string Segment, IReadOnlyList<ChronicleDecisionSave>? Decisions);

/// <summary>
/// One independent story history (handover §4): its book, the chapter reached and the choices made. It holds narrative facts
/// only, so replaying, abandoning or deleting a Chronicle never touches power, research or world discovery.
/// </summary>
public sealed class ChronicleState
{
    private readonly List<(StoryId Decision, StoryId Option)> decisions = [];

    public ChronicleState(int number, StoryBookDefinition book)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(number, 1);
        Number = number;
        Book = book ?? throw new ArgumentNullException(nameof(book));
    }

    public int Number { get; }
    public StoryBookDefinition Book { get; }
    public int SegmentIndex { get; private set; }
    public StorySegmentDefinition Segment => Book.Segments[SegmentIndex];

    /// <summary>Choices in the order they were made.</summary>
    public IReadOnlyList<(StoryId Decision, StoryId Option)> Decisions => decisions;

    public StoryId? ChoiceFor(StoryId decision) => decisions.Where(entry => entry.Decision == decision).Select(entry => (StoryId?)entry.Option).FirstOrDefault();

    /// <summary>The final decision's option is the ending; a Chronicle is complete once it is chosen.</summary>
    public StoryEndingDefinition? Ending => ChoiceFor(Book.FinalDecision.Id) is { } option ? Book.Ending(option) : null;

    public bool Completed => Ending is not null;

    public bool CanAdvance => !Completed && SegmentIndex < Book.Segments.Count - 1
        && Book.DecisionsIn(Segment.Id).All(decision => ChoiceFor(decision.Id) is not null);

    public ChronicleDecisionResult Decide(StoryId decisionId, StoryId optionId)
    {
        if (Completed) return ChronicleDecisionResult.ChronicleComplete;
        var decision = Book.Decision(decisionId);
        if (decision is null) return ChronicleDecisionResult.UnknownDecision;
        if (decision.Option(optionId) is null) return ChronicleDecisionResult.UnknownOption;
        if (ChoiceFor(decisionId) is not null) return ChronicleDecisionResult.AlreadyDecided;
        if (decision.Segment != Segment.Id) return ChronicleDecisionResult.NotReached;
        decisions.Add((decisionId, optionId));
        return ChronicleDecisionResult.Recorded;
    }

    /// <summary>Moves to the next chapter once every choice in this one is made.</summary>
    public bool Advance()
    {
        if (!CanAdvance) return false;
        SegmentIndex++;
        return true;
    }

    public ChronicleSave Save() => new(Number, Book.Id.Value, Book.Version, Segment.Id.Value,
        [.. decisions.Select(entry => new ChronicleDecisionSave(entry.Decision.Value, entry.Option.Value))]);

    /// <summary>
    /// Rebuilds a Chronicle by replaying its saved choices in chapter order. Choices a newer book version no longer knows are
    /// dropped, and the chapter never runs ahead of the choices that lead to it.
    /// </summary>
    public static ChronicleState? Restore(ChronicleSave? save, Func<StoryId, StoryBookDefinition?> books)
    {
        ArgumentNullException.ThrowIfNull(books);
        if (save is null || save.Number < 1 || !StoryId.TryParse(save.Book, out var bookId) || books(bookId) is not { } book) return null;
        var chronicle = new ChronicleState(save.Number, book);
        var target = StoryId.TryParse(save.Segment, out var segment) ? Math.Max(0, book.SegmentIndex(segment)) : 0;
        var saved = (save.Decisions ?? [])
            .Where(entry => entry is not null && StoryId.TryParse(entry.Decision, out _) && StoryId.TryParse(entry.Option, out _))
            .Select(entry => (Decision: new StoryId(entry.Decision), Option: new StoryId(entry.Option)))
            .ToArray();
        while (true)
        {
            foreach (var decision in book.DecisionsIn(chronicle.Segment.Id))
                if (saved.FirstOrDefault(entry => entry.Decision == decision.Id) is { Decision.Value: not null } choice) chronicle.Decide(choice.Decision, choice.Option);
            if (chronicle.SegmentIndex >= target || !chronicle.Advance()) break;
        }
        return chronicle;
    }
}
