namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>Actual Fireball persistent ground fire, distinguished from generic visual essence bursts.</summary>
public sealed record BurningGroundRenderSnapshot(long Id, double X, double Y, double Radius, double RemainingSeconds);
