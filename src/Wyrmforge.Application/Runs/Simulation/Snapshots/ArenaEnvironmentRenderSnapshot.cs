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
    public HuntArenaGenerator.WetForestRecipe? WetForest { get; init; }
    /// <summary>Versioned site/edge/material identity; presentation must not generate a second graph.</summary>
    public WorldSiteGeography? Geography { get; init; }
    /// <summary>Optional C# XYZ top-face matrix for world-first reviews; absent in normal Hunts.</summary>
    public WorldSiteStrataRenderSnapshot? Strata { get; init; }
    /// <summary>True when the C# landscape obstacles are actual gameplay colliders.</summary>
    public bool GeographyActive { get; init; }
    public IReadOnlyList<ArenaPropRenderSnapshot> Props { get; init; } = [];
}
