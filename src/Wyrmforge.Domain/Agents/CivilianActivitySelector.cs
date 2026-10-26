using System.Collections.Immutable;

namespace Wyrmforge.Domain.Agents;

public enum CivilianActivity { Work, Visit, Socialize, Rest, Wait }
public sealed record CivilianActivityOption(string PlaceId, CivilianActivity Activity, double Utility,
    bool IsOpen, bool SlotAvailable);
public sealed record CivilianActivitySelection(string? PlaceId, CivilianActivity Activity,
    ImmutableArray<AgentAlternative> Alternatives);

/// <summary>Scene-independent utility selection. The Town executor must reserve the chosen slot atomically before moving.</summary>
public static class CivilianActivitySelector
{
    public const int OptionLimit = 16;

    public static CivilianActivitySelection Select(ImmutableArray<CivilianActivityOption> options)
    {
        if (options.IsDefault || options.Length > OptionLimit
            || options.Any(o => string.IsNullOrWhiteSpace(o.PlaceId) || !Enum.IsDefined(o.Activity) || !double.IsFinite(o.Utility))
            || options.Select(o => (o.PlaceId, o.Activity)).Distinct().Count() != options.Length)
            throw new ArgumentException("Activity options must be valid, unique and bounded.", nameof(options));

        var alternatives = options.Select(o => new AgentAlternative(o.Activity.ToString(), o.PlaceId, o.Utility,
            o.IsOpen && o.SlotAvailable, !o.IsOpen ? "place-closed" : !o.SlotAvailable ? "slot-occupied" : "available-activity"))
            .OrderBy(a => a.Action, StringComparer.Ordinal).ThenBy(a => a.Goal, StringComparer.Ordinal).ToImmutableArray();
        var chosen = alternatives.Where(a => a.Allowed && a.Score > 0).OrderByDescending(a => a.Score)
            .ThenBy(a => a.Action, StringComparer.Ordinal).ThenBy(a => a.Goal, StringComparer.Ordinal).FirstOrDefault();
        return chosen is null ? new(null, CivilianActivity.Wait, alternatives)
            : new(chosen.Action, Enum.Parse<CivilianActivity>(chosen.Goal), alternatives);
    }
}
