using System.Text.Json.Serialization;

namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>Exact renderer-neutral G1 wire contract. Every snapshot replaces the prior scene.</summary>
public sealed record GpuLightingFrame(
    [property: JsonPropertyName("version")] int Version,
    [property: JsonPropertyName("time")] double Time,
    [property: JsonPropertyName("lights")] IReadOnlyList<GpuLightEmitter> Lights,
    [property: JsonPropertyName("materials")] IReadOnlyList<GpuLitMaterial> Materials,
    [property: JsonPropertyName("objects")] IReadOnlyList<GpuLitObject> Objects,
    [property: JsonPropertyName("environment")] GpuLightingEnvironment Environment);

public sealed record GpuLightEmitter(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("ownerId")] string OwnerId,
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("enabled")] bool Enabled,
    [property: JsonPropertyName("position")] double[] Position,
    [property: JsonPropertyName("direction")] double[] Direction,
    [property: JsonPropertyName("color")] string Color,
    [property: JsonPropertyName("intensity")] double Intensity,
    [property: JsonPropertyName("range")] double Range,
    [property: JsonPropertyName("coneAngle")] double ConeAngle,
    [property: JsonPropertyName("penumbra")] double Penumbra,
    [property: JsonPropertyName("castsShadow")] bool CastsShadow,
    [property: JsonPropertyName("priority")] double Priority,
    [property: JsonPropertyName("expiresAt"), property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] double? ExpiresAt = null);

public sealed record GpuLightingEnvironment(
    [property: JsonPropertyName("ambient")] double Ambient,
    [property: JsonPropertyName("color")] string Color,
    [property: JsonPropertyName("exposure")] double Exposure,
    [property: JsonPropertyName("emission")] bool Emission);

public sealed record GpuLitMaterial(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("color")] string Color,
    [property: JsonPropertyName("roughness")] double Roughness,
    [property: JsonPropertyName("metalness")] double Metalness,
    [property: JsonPropertyName("specular")] double Specular,
    [property: JsonPropertyName("reflection")] string Reflection,
    [property: JsonPropertyName("emission")] string Emission,
    [property: JsonPropertyName("emissionIntensity")] double EmissionIntensity,
    [property: JsonPropertyName("alphaCutoff")] double AlphaCutoff,
    [property: JsonPropertyName("doubleSided")] bool DoubleSided);

public sealed record GpuLitObject(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("ownerId")] string OwnerId,
    [property: JsonPropertyName("geometry")] string Geometry,
    [property: JsonPropertyName("material")] string Material,
    [property: JsonPropertyName("position")] double[] Position,
    [property: JsonPropertyName("rotation")] double[] Rotation,
    [property: JsonPropertyName("scale")] double[] Scale,
    [property: JsonPropertyName("castsShadow")] bool CastsShadow,
    [property: JsonPropertyName("receivesShadow")] bool ReceivesShadow,
    [property: JsonPropertyName("receivesLight")] bool ReceivesLight);

/// <summary>Maps any authoritative emitter to G1; does not know spell or object types.</summary>
public static class GpuLightingFrameProjection
{
    public static GpuLightingFrame FromSnapshot(LightingSnapshot snapshot, double simulationTime,
        IReadOnlyList<GpuLitMaterial>? materials = null, IReadOnlyList<GpuLitObject>? objects = null)
    {
        snapshot.Validate();
        if (!double.IsFinite(simulationTime) || simulationTime < 0)
            throw new ArgumentOutOfRangeException(nameof(simulationTime));

        return new GpuLightingFrame(
            1, simulationTime,
            snapshot.Emitters
                .Where(light => !light.ExpiresAtTick.HasValue || light.ExpiresAtTick.Value > snapshot.SimulationTick)
                .OrderBy(light => light.Id, StringComparer.Ordinal)
                .Select(light => new GpuLightEmitter(
                light.Id, light.OwnerId, light.Type, light.Enabled,
                [light.X, light.Y, light.Z],
                [light.DirectionX, light.DirectionY, light.DirectionZ],
                light.Color, light.Intensity, light.Radius,
                Math.PI / 4, 0, light.CastsShadows, 0,
                null)).ToArray(),
            materials ?? [], objects ?? [],
            new GpuLightingEnvironment(snapshot.Environment.AmbientIntensity,
                snapshot.Environment.AmbientColor, 1, true));
    }
}
