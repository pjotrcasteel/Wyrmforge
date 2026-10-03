namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record ExtractionRenderSnapshot(double X, double Y, double Radius, double Progress, double RemainingSeconds, bool IsProgressing);
