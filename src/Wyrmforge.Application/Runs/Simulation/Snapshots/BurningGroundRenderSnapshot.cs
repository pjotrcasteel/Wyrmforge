namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>
/// Persistent damaging area from the authoritative C# simulation.
/// The radius and remaining lifetime are gameplay facts, not inferred from particles.
/// </summary>
public sealed record BurningGroundRenderSnapshot(double X, double Y, double Radius, double RemainingSeconds)
{
    public int FireballMutationMask { get; init; }
    public int FireballSourceId { get; init; }
}
