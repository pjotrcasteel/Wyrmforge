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
        if (Environment is null || string.IsNullOrWhiteSpace(Environment.Profile) || !ValidColor(Environment.AmbientColor) ||
            !double.IsFinite(Environment.AmbientIntensity) || Environment.AmbientIntensity < 0)
            throw new ArgumentException("Invalid ambient intensity.");
        var ids = new HashSet<string>(StringComparer.Ordinal);
        if (Emitters is null) throw new ArgumentException("Lighting emitters cannot be null.");
        foreach (var emitter in Emitters)
        {
            if (string.IsNullOrWhiteSpace(emitter.Id) || !ids.Add(emitter.Id))
                throw new ArgumentException("Lighting emitter IDs must be nonempty and unique.");
            if (string.IsNullOrWhiteSpace(emitter.OwnerId) || !ValidColor(emitter.Color) ||
                emitter.Type is not ("point" or "spot" or "directional") ||
                !double.IsFinite(emitter.DirectionX) || !double.IsFinite(emitter.DirectionY) ||
                !double.IsFinite(emitter.DirectionZ) ||
                (emitter.Type != "point" && emitter.DirectionX == 0 && emitter.DirectionY == 0 && emitter.DirectionZ == 0))
                throw new ArgumentException($"Invalid lighting emitter metadata '{emitter.Id}'.");
            if (!double.IsFinite(emitter.X) || !double.IsFinite(emitter.Y) ||
                !double.IsFinite(emitter.Z) || !double.IsFinite(emitter.Intensity) ||
                !double.IsFinite(emitter.Radius) || emitter.Intensity < 0 || emitter.Radius <= 0)
                throw new ArgumentException($"Invalid lighting emitter '{emitter.Id}'.");
        }
    }

    private static bool ValidColor(string? value) => value is { Length: 7 } && value[0] == '#' &&
        value.Skip(1).All(character => char.IsAsciiHexDigit(character));
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
