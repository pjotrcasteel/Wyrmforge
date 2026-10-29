namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>Identity-bearing presentation event from an actual Ashfang commitment or impact; never creates damage.</summary>
public sealed record AshfangEffectRenderSnapshot(int Id, string Kind, double X, double Y, double DirectionX,
    double DirectionY, double Radius, double Progress);
