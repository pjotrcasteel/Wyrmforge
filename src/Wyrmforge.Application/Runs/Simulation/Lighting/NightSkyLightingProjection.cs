namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>
/// One world-space moon/sky key for outdoor gothic-night Hunts.
/// Generic LightingEngine directional source, never an unlit Canvas overlay.
/// C# remains the sole authority for source lifecycle and color.
/// </summary>
public static class NightSkyLightingProjection
{
    public const string SourceId = "sky:moon";

    /// <summary>Uniform moonlight makes albedo and 2.5D silhouettes readable between transient spells.</summary>
    public static LightingEmitter Capture() =>
        new(
            Id: SourceId,
            OwnerId: "night-sky",
            Type: "directional",
            X: 0,
            Y: 0,
            Z: 256,
            Color: "#91a6c5",
            Intensity: 2.2,
            Radius: 8192,
            CastsShadows: false,
            DirectionX: 0,
            DirectionY: 0,
            DirectionZ: -1);
}
