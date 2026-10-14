namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record ArenaSupplyRenderSnapshot(string Kind, double X, double Y, bool Open);

public sealed record ArenaEnvironmentRenderSnapshot(
    int Seed,
    string Biome,
    int Stage,
    string Landmark,
    IReadOnlyList<ArenaSupplyRenderSnapshot> Supplies);
