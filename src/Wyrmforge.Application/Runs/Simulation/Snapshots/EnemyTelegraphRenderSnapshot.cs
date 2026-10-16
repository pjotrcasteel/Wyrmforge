namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>
/// A committed enemy attack the hunter can read before it lands. Kind is "pounce" (lane from X/Y to TargetX/TargetY, Radius
/// is half its width), "lob" (ground mark at TargetX/TargetY with Radius), "bash" (frontal arc toward TargetX/TargetY with reach Radius),
/// "heal" (tether to the locked ally at TargetX/TargetY, Radius is its body) or "revive" (ritual circle at TargetX/TargetY with Radius).
/// Progress runs 0→1 over the windup or cast.
/// </summary>
public sealed record EnemyTelegraphRenderSnapshot(string Kind, double Progress, double TargetX, double TargetY, double Radius);

/// <summary>An ember in flight: ground shadow at X/Y, drawn Height above it, landing inside the mark at TargetX/TargetY.</summary>
public sealed record HostileProjectileRenderSnapshot(double X, double Y, double Height, double TargetX, double TargetY, double Radius, double Progress);

/// <summary>Remains of a fallen Ashling at X/Y; Life runs 1→0 before they crumble and can no longer be raised.</summary>
public sealed record AshRemainsRenderSnapshot(double X, double Y, double Life);
