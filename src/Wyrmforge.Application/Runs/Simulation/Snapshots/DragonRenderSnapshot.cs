namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record DragonRenderSnapshot(string Name, string Title, double X, double Y, double Radius, double Health, double MaxHealth, int Phase, bool Frozen);
