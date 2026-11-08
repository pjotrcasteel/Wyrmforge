namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>One C#-owned Ashfang breath scorch. Burning means damaging; a cooled mark is strictly cosmetic.</summary>
public sealed record AshfangGroundFireRenderSnapshot(int Id, double X, double Y, double Z,
    double Radius, double AgeSeconds, bool Burning)
{
    /// <summary>Physical surface fuel: dryorganic, damporganic or wood; never inferred from sprite colors.</summary>
    public string Fuel { get; init; } = "dryorganic";

    /// <summary>Authoritative burn and visible fade durations, kept in sync with physical fuel rules.</summary>
    public double HotSeconds { get; init; } = 2.75;
    public double VisibleSeconds { get; init; } = 9;
}
