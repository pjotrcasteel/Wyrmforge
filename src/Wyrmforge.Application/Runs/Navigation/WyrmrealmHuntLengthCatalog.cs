namespace Wyrmforge.Application.Runs.Navigation;

/// <summary>Route budgets for the currently implemented difficulty depths, separate from pressure stages.
/// A known Wyrm threat tier is not yet selected before map generation; depth is the available pacing input.</summary>
public sealed record WyrmrealmHuntLengthProfile(int Depth, int ShortRoadEncounters, int MediumRoadEncounters,
    int LongRoadEncounters, int MaximumRoadChoices)
{
    // Two opening encounters, the village and the final approach remain authored common sites.
    public int MinimumCombatEncounters => 4 + 2 * ShortRoadEncounters;
    public int MaximumCombatEncounters => 4 + 2 * LongRoadEncounters;
}

public static class WyrmrealmHuntLengthCatalog
{
    public const int GeneratorVersion = 2;
    public static IReadOnlyList<WyrmrealmHuntLengthProfile> All { get; } =
    [
        new(1, 1, 2, 3, 3),
        new(2, 2, 3, 4, 4),
        new(3, 3, 4, 5, 4),
        new(4, 4, 5, 6, 4),
    ];

    public static WyrmrealmHuntLengthProfile Get(int depth) => All.SingleOrDefault(profile => profile.Depth == depth)
        ?? throw new ArgumentOutOfRangeException(nameof(depth), depth, "No Hunt length profile is registered for this depth.");
}
