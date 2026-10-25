using System.Text.Json.Serialization;

namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>Renderer-independent, authoritative lighting wire format (G2).</summary>
/// <remarks>Snapshots replace the complete emitter set; consumers must remove IDs absent from the next frame.</remarks>
public sealed record LightingSnapshot(
    int SchemaVersion,
    long SimulationTick,
    string SceneId,
    LightingEnvironment Environment,
    IReadOnlyList<LightingEmitter> Emitters)
{
    public const int CurrentSchemaVersion = 1;

    public void Validate()
    {
        if (SchemaVersion != CurrentSchemaVersion) throw new ArgumentOutOfRangeException(nameof(SchemaVersion));
        if (SimulationTick < 0 || string.IsNullOrWhiteSpace(SceneId)) throw new ArgumentException("Invalid lighting scene identity or tick.");
        if (!double.IsFinite(Environment.AmbientIntensity) || Environment.AmbientIntensity < 0)
            throw new ArgumentException("Invalid ambient intensity.");
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var emitter in Emitters)
        {
            if (string.IsNullOrWhiteSpace(emitter.Id) || !ids.Add(emitter.Id))
                throw new ArgumentException("Lighting emitter IDs must be nonempty and unique.");
            if (!double.IsFinite(emitter.X) || !double.IsFinite(emitter.Y) ||
                !double.IsFinite(emitter.Z) || !double.IsFinite(emitter.Intensity) ||
                !double.IsFinite(emitter.Radius) || emitter.Intensity < 0 || emitter.Radius <= 0)
                throw new ArgumentException($"Invalid lighting emitter '{emitter.Id}'.");
        }
    }
}

public sealed record LightingEnvironment(string Profile, string AmbientColor, double AmbientIntensity);

public sealed record LightingEmitter(
    string Id,
    string OwnerId,
    string Type,
    double X,
    double Y,
    double Z,
    string Color,
    double Intensity,
    double Radius,
    bool Enabled = true,
    bool CastsShadows = true,
    double DirectionX = 0,
    double DirectionY = 0,
    double DirectionZ = -1,
    long? ExpiresAtTick = null);
