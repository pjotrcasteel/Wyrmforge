namespace Wyrmforge.Domain.Chronicles;

public sealed record ChronicleRegistrySave(int? Active, int NextNumber, IReadOnlyList<ChronicleSave>? Chronicles);

/// <summary>
/// Every Chronicle a player has begun (handover §4). Beginning a new one never overwrites another; several can be in
/// progress, and completed ones form the Hall of Legends.
/// </summary>
public sealed class ChronicleRegistry(Func<StoryId, StoryBookDefinition?>? books = null)
{
    private readonly Func<StoryId, StoryBookDefinition?> books = books ?? StoryBookCatalog.Find;
    private readonly List<ChronicleState> chronicles = [];
    private int nextNumber = 1;

    public IReadOnlyList<ChronicleState> Chronicles => chronicles;
    public ChronicleState? Active { get; private set; }
    public IEnumerable<ChronicleState> HallOfLegends => chronicles.Where(chronicle => chronicle.Completed);

    /// <returns>The new Chronicle, or null while the book has no playable content.</returns>
    public ChronicleState? Begin(StoryBookDefinition book)
    {
        ArgumentNullException.ThrowIfNull(book);
        if (book.Status != StoryBookStatus.Playable) return null;
        var chronicle = new ChronicleState(nextNumber++, book);
        chronicles.Add(chronicle);
        Active = chronicle;
        return chronicle;
    }

    public bool Resume(int number)
    {
        if (chronicles.FirstOrDefault(chronicle => chronicle.Number == number) is not { } chronicle) return false;
        Active = chronicle;
        return true;
    }

    public ChronicleRegistrySave Save() => new(Active?.Number, nextNumber, [.. chronicles.Select(chronicle => chronicle.Save())]);

    /// <summary>Restores a save. Chronicles of unknown books or with duplicate numbers are dropped; numbers are never reused.</summary>
    public void Restore(ChronicleRegistrySave? save)
    {
        chronicles.Clear();
        Active = null;
        nextNumber = 1;
        if (save is null) return;
        foreach (var entry in save.Chronicles ?? [])
        {
            if (ChronicleState.Restore(entry, books) is not { } chronicle || chronicles.Any(existing => existing.Number == chronicle.Number)) continue;
            chronicles.Add(chronicle);
        }
        nextNumber = Math.Max(save.NextNumber, chronicles.Count == 0 ? 1 : chronicles.Max(chronicle => chronicle.Number) + 1);
        if (save.Active is { } active) Resume(active);
    }
}
