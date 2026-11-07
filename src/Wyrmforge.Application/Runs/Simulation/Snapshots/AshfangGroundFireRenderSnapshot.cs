namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>One C#-owned Ashfang breath scorch. Burning means damaging; a cooled mark is strictly cosmetic.</summary>
public sealed record AshfangGroundFireRenderSnapshot(int Id, double X, double Y, double Z,
    double Radius, double AgeSeconds, bool Burning);
