namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record ArenaSupplyRenderSnapshot(string Kind, double X, double Y, bool Open);

public sealed record ArenaBarrierRenderSnapshot(double X, double Y, double Width, double Height, bool Open, string Kind);

public sealed record ArenaEnvironmentRenderSnapshot(
    int Seed,
    string Biome,
    string Element,
    int Stage,
    string Landmark,
    IReadOnlyList<ArenaSupplyRenderSnapshot> Supplies,
    IReadOnlyList<ArenaBarrierRenderSnapshot> Barriers,
    string District,
    string Habitat = "Outskirts");
