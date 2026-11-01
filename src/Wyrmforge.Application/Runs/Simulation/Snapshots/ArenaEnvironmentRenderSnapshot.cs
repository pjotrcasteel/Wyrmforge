using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record ArenaSupplyRenderSnapshot(string Kind, double X, double Y, bool Open)
{
    /// <summary>Stable C# site identity for one-time optional finds; null for ordinary supplies.</summary>
    public string? DiscoveryId { get; init; }
}

public sealed record ArenaBarrierRenderSnapshot(double X, double Y, double Width, double Height, bool Open, string Kind);

public sealed record ArenaPropRenderSnapshot(int Id, string Kind, double X, double Y, double Radius, double HealthFraction);

/// <summary>A solid one-metre-thick XYZ ground layer, subdivided into exact four-pixel microcells.</summary>
public sealed record ArenaGreyboxGridRenderSnapshot(
    double CellSizeMeters, int PixelsPerFace, int MicrocellsPerAxis,
    double GroundBaseMeters, double GroundTopMeters)
{
    public double MicrocellSizeMeters => CellSizeMeters / MicrocellsPerAxis;
}

public sealed record ArenaEnvironmentRenderSnapshot(
    int Seed,
    string Biome,
    string Element,
    int Stage,
    string Landmark,
    IReadOnlyList<ArenaSupplyRenderSnapshot> Supplies,
    IReadOnlyList<ArenaBarrierRenderSnapshot> Barriers,
    string District,
    string Habitat = "Outskirts")
{
    public double Corruption { get; init; }
    public bool GeneratorPreview { get; init; }
    /// <summary>Read-only flat XYZ ground contract; source-pixel density is not screen pixel size.</summary>
    public ArenaGreyboxGridRenderSnapshot? Greybox { get; init; }
    public HuntArenaGenerator.WetForestRecipe? WetForest { get; init; }
    /// <summary>Versioned site/edge/material identity; presentation must not generate a second graph.</summary>
    public WorldSiteGeography? Geography { get; init; }
    /// <summary>True when the C# landscape obstacles are actual gameplay colliders.</summary>
    public bool GeographyActive { get; init; }
    public IReadOnlyList<ArenaPropRenderSnapshot> Props { get; init; } = [];
}
