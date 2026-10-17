namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record PlayerRenderSnapshot(double X, double Y, double Radius, bool Barrier)
{
    public int FocusCharge { get; init; }

    /// <summary>Warding Pulse readiness 0→1, or null when no contextual spell is prepared.</summary>
    public double? WardCharge { get; init; }
}
