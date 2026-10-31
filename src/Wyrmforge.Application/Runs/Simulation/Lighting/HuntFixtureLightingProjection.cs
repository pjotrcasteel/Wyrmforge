namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>
/// G5's fixed world sources enter the same C# lighting snapshot as projectiles,
/// the moon and actor emission. These are passive visual fixtures; they do not
/// make gameplay decisions or create a second environmental lighting loop.
/// </summary>
public static class HuntFixtureLightingProjection
{
    public static IReadOnlyList<LightingEmitter> Capture(
        HuntArenaGenerator.WetForestRecipe? recipe, double worldWidth, double worldHeight)
    {
        if (recipe is null) return [];
        if (!double.IsFinite(worldWidth) || !double.IsFinite(worldHeight) ||
            worldWidth <= 0 || worldHeight <= 0)
            throw new ArgumentOutOfRangeException(nameof(worldWidth));

        return recipe.LightFixtures.Select(fixture =>
        {
            if (fixture.Kind != "torch" || string.IsNullOrWhiteSpace(fixture.Id) ||
                !double.IsFinite(fixture.X) || !double.IsFinite(fixture.Y) ||
                !double.IsFinite(fixture.Height) || fixture.X is < 0 or > 1 ||
                fixture.Y is < 0 or > 1 || fixture.Height <= 0 ||
                !double.IsFinite(fixture.Intensity) || fixture.Intensity < 0 ||
                !double.IsFinite(fixture.Range) || fixture.Range <= 0)
                throw new ArgumentException("Invalid authored Hunt lighting fixture.");
            // G5's reduced shadow tier retains all direct illumination without
            // projecting an unverified tall caster from decorative torch art.
            return new LightingEmitter(fixture.Id, fixture.Id, "point",
                fixture.X * worldWidth, fixture.Y * worldHeight, fixture.Height,
                fixture.Color, fixture.Intensity, fixture.Range,
                Enabled: fixture.Enabled, CastsShadows: false,
                ExpiresAtTick: fixture.ExpiresAtTick);
        }).OrderBy(light => light.Id, StringComparer.Ordinal).ToArray();
    }
}
