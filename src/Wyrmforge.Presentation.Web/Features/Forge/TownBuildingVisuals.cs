namespace Wyrmforge.Presentation.Web.Features.Forge;

/// <summary>
/// Visual state is derived from the same unlock flags as town interaction.
/// Vacant artwork is baked at native panorama resolution; never shade the entire
/// screen or the building with a CSS black veil.
/// </summary>
internal enum TownBuildingState { Active, Vacant }

internal sealed record TownBuildingVisual(string Key, TownBuildingState State, string? Image, string? CssClass)
{
    public string StateName => TownBuildingVisuals.StateName(State == TownBuildingState.Active);
}

internal static class TownBuildingVisuals
{
    // Update after regenerating and committing the pre-painted dormant plates.
    internal const string AssetVersion = "131";
    internal static string StateName(bool unlocked) => unlocked ? "active" : "vacant";

    internal static IReadOnlyList<TownBuildingVisual> Resolve(bool nexusUnlocked, bool forgeUnlocked, bool codexUnlocked, bool hallUnlocked)
    {
        return
        [
            new("build", nexusUnlocked ? TownBuildingState.Active : TownBuildingState.Vacant,
                nexusUnlocked ? null : "town-vacant-nexus.webp", nexusUnlocked ? null : "town-dormant-art--build"),

            // The base painting is vacant, but still contains *painted chimney smoke*.
            // Its dormant plate removes that smoke; when unlocked the original occupied
            // Forge artwork replaces it, without affecting neighboring buildings.
            new("forge", forgeUnlocked ? TownBuildingState.Active : TownBuildingState.Vacant,
                forgeUnlocked ? "refuge-town-panorama.png" : "town-vacant-forge.webp",
                forgeUnlocked ? "town-panorama-open-forge" : "town-dormant-art--forge"),

            new("codex", codexUnlocked ? TownBuildingState.Active : TownBuildingState.Vacant,
                codexUnlocked ? null : "town-vacant-codex.webp", codexUnlocked ? null : "town-dormant-art--codex"),

            new("legends", hallUnlocked ? TownBuildingState.Active : TownBuildingState.Vacant,
                hallUnlocked ? null : "town-vacant-legends.webp", hallUnlocked ? null : "town-dormant-art--legends"),
        ];
    }
}
