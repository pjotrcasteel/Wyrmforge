using Wyrmforge.Domain;

namespace Wyrmforge.Domain.Chronicles;

/// <summary>Stable identity of a story book, or of a segment, decision or option inside one. Kebab-case so data can grow without renumbering saves.</summary>
public readonly record struct StoryId
{
    public StoryId(string value)
    {
        if (!KebabCase.IsValid(value)) throw new ArgumentException("A story id is lower-case kebab-case.", nameof(value));
        Value = value;
    }

    public string Value { get; }

    public static bool TryParse(string? value, out StoryId id)
    {
        id = default;
        if (!KebabCase.IsValid(value)) return false;
        id = new StoryId(value!);
        return true;
    }

    public override string ToString() => Value;
}

public enum StoryBookStatus
{
    /// <summary>Outline and canon exist; no playable chapter content yet. A Chronicle cannot begin.</summary>
    InPreparation,
    Playable,
}

/// <summary>One chapter of a book: what happens and what it asks of the player's hunts.</summary>
public sealed record StorySegmentDefinition(StoryId Id, string Title, string Premise, string Gameplay);

public sealed record StoryOptionDefinition(StoryId Id, string Title, string Consequence);

/// <summary>A consequence-rich choice made once per Chronicle. It may change lives and places, never gameplay power.</summary>
public sealed record StoryDecisionDefinition(StoryId Id, StoryId Segment, string Title, string Question, IReadOnlyList<StoryOptionDefinition> Options)
{
    public StoryOptionDefinition? Option(StoryId id) => Options.FirstOrDefault(option => option.Id == id);
}

/// <summary>A resolution of the book. Endings are not ranked; they decide nothing in shared endgame play.</summary>
public sealed record StoryEndingDefinition(StoryId Id, string Title, string Theme, string Summary);

/// <summary>A sympathetic, conflicting voice. A character who can die is never the only provider of a game service.</summary>
public sealed record StoryRoleDefinition(string Role, string Name, string Stance);

/// <summary>
/// A data-driven, versioned story book (handover §3, §15 Phase D). The final decision's options are the book's endings, so a
/// Chronicle ends exactly when its last choice is made.
/// </summary>
public sealed record StoryBookDefinition(
    StoryId Id,
    string Title,
    int Version,
    StoryBookStatus Status,
    string CentralQuestion,
    string Setting,
    IReadOnlyList<StorySegmentDefinition> Segments,
    IReadOnlyList<StoryDecisionDefinition> Decisions,
    IReadOnlyList<StoryEndingDefinition> Endings,
    IReadOnlyList<StoryRoleDefinition> Roles)
{
    public StoryDecisionDefinition? Decision(StoryId id) => Decisions.FirstOrDefault(decision => decision.Id == id);

    public StoryDecisionDefinition FinalDecision => Decisions[^1];

    public int SegmentIndex(StoryId segment)
    {
        for (var index = 0; index < Segments.Count; index++)
            if (Segments[index].Id == segment) return index;
        return -1;
    }

    public IEnumerable<StoryDecisionDefinition> DecisionsIn(StoryId segment) => Decisions.Where(decision => decision.Segment == segment);

    public StoryEndingDefinition? Ending(StoryId id) => Endings.FirstOrDefault(ending => ending.Id == id);
}
