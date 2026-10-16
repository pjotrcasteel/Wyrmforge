namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>
/// A committed enemy attack the hunter can read before it lands. Kind is "pounce" (lane from X/Y to TargetX/TargetY, Radius
/// is half its width) or "lob" (ground mark at TargetX/TargetY with Radius). Progress runs 0→1 over the windup.
/// </summary>
public sealed record EnemyTelegraphRenderSnapshot(string Kind, double Progress, double TargetX, double TargetY, double Radius);

/// <summary>An ember in flight: ground shadow at X/Y, drawn Height above it, landing inside the mark at TargetX/TargetY.</summary>
public sealed record HostileProjectileRenderSnapshot(double X, double Y, double Height, double TargetX, double TargetY, double Radius, double Progress);
