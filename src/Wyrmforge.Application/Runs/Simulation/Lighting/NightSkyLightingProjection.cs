namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>
/// One world-space moon/sky key for outdoor gothic-night Hunts.
/// Generic LightingEngine directional source, never an unlit Canvas overlay.
/// C# remains the sole authority for source lifecycle and color.
/// </summary>
public static class NightSkyLightingProjection
{
    public const string SourceId = "sky:moon";

    /// <summary>
    /// Uniform moonlight makes albedo and 2.5D silhouettes readable between transient spells. With <paramref name="relief"/> (the Hunt 1.0
    /// terrain) the moon stands low in the north-west, so the normal maps of ground, rock and trunks model relief the way the pixel art is lit.
    /// </summary>
    public static LightingEmitter Capture(bool relief = false) =>
        new(
            Id: SourceId,
            OwnerId: "night-sky",
            Type: "directional",
            X: 0,
            Y: 0,
            Z: 256,
            Color: "#91a6c5",
            Intensity: relief ? 2.9 : 2.2,
            Radius: 8192,
            CastsShadows: false,
            DirectionX: relief ? 0.45 : 0,
            DirectionY: relief ? 0.6 : 0,
            DirectionZ: relief ? -0.66 : -1);
}
