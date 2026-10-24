namespace Wyrmforge.Presentation.Web.Features.Forge;

/// <summary>
/// Canonical independent building paintings. Each active/vacant pair has identical
/// framing and is served as a first-party static asset, never via CSS darkening.
/// Unlock flags are authoritative; visuals are never an additional progression state.
/// </summary>
internal enum TownBuildingState { Active, Vacant }

internal sealed record TownBuildingVisual(string Key, TownBuildingState State, string Image, string? CssClass = null)
{
    public string StateName => TownBuildingVisuals.StateName(State == TownBuildingState.Active);
}

internal static class TownBuildingVisuals
{
    internal const string AssetVersion = "131";
    internal static string StateName(bool unlocked) => unlocked ? "active" : "vacant";

    internal static IReadOnlyList<TownBuildingVisual> Resolve(bool nexusUnlocked, bool forgeUnlocked, bool codexUnlocked, bool hallUnlocked) =>
    [
        Building("build", "ArcaneNexus", nexusUnlocked),
        Building("forge", "Blacksmith", forgeUnlocked),
        Building("codex", "Codex", codexUnlocked),
        Building("legends", "HallOfFame", hallUnlocked),
    ];

    private static TownBuildingVisual Building(string key, string folder, bool unlocked) =>
        new(key, unlocked ? TownBuildingState.Active : TownBuildingState.Vacant,
            $"buildings/{folder}/{StateName(unlocked)}.png");
}
