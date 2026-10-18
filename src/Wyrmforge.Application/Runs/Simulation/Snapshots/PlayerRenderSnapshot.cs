namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record PlayerRenderSnapshot(double X, double Y, double Radius, bool Barrier)
{
    public int FocusCharge { get; init; }

    /// <summary>Warding Pulse readiness 0→1, or null when no contextual spell is prepared.</summary>
    public double? WardCharge { get; init; }

    /// <summary>Frost Chill stacks on the hunter (0 = warm).</summary>
    public int Chill { get; init; }

    /// <summary>The hunter stands on black ice and has lost footing.</summary>
    public bool OnBlackIce { get; init; }
}
