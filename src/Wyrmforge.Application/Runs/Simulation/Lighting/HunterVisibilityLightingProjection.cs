using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>
/// Authoritative visual visibility source for a moving hunter in night Hunts.
/// Mirrors the existing Canvas player-near visibility without altering combat,
/// targeting, environmental ambient, world geometry or global lighting.
/// </summary>
public static class HunterVisibilityLightingProjection
{
    public const string SourceId = "hunter:night-visibility";

    /// <summary>Create the same stable source ID at the current C# player position each snapshot.</summary>
    public static LightingEmitter Capture(Vector2D position) =>
        new(
            Id: SourceId,
            OwnerId: "hunter",
            Type: "point",
            X: position.X,
            Y: position.Y,
            Z: 64,
            Color: "#bfc9dc",
            Intensity: 5.5,
            Radius: 175,
            CastsShadows: false);
}
