namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>The Warding Pulse ring expanding from where it was cast; Progress runs 0→1.</summary>
public sealed record WardPulseRenderSnapshot(double X, double Y, double Radius, double Progress);
