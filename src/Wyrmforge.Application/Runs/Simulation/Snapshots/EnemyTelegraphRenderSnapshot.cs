namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>
/// A committed enemy attack the hunter can read before it lands. Kind is "pounce" (lane from X/Y to TargetX/TargetY, Radius
/// is half its width), "lob" (ground mark at TargetX/TargetY with Radius), "bash" (frontal arc toward TargetX/TargetY with reach Radius),
/// "claw" (Drowned Wraith frontal wedge toward TargetX/TargetY with reach Radius, same arc as "bash"), "heal" (tether to the locked ally at TargetX/TargetY, Radius is its body) or "revive" (ritual circle at TargetX/TargetY with Radius).
/// Progress runs 0→1 over the windup or cast.
/// </summary>
public sealed record EnemyTelegraphRenderSnapshot(string Kind, double Progress, double TargetX, double TargetY, double Radius);

/// <summary>An ember in flight: ground shadow at X/Y, drawn Height above it, landing inside the mark at TargetX/TargetY.</summary>
public sealed record HostileProjectileRenderSnapshot(double X, double Y, double Height, double TargetX, double TargetY, double Radius, double Progress,
    string Style = "ember");

/// <summary>Remains of a fallen Ashling at X/Y; Life runs 1→0 before they crumble and can no longer be raised.</summary>
public sealed record AshRemainsRenderSnapshot(double X, double Y, double Life);

/// <summary>
/// A Drowned Wraith under the water at X/Y. Drifting ripples are faint; an emerging one marks the exact spot it will rise,
/// with Progress running 0→1 over the 0.8s tell. Radius is the body it will surface with.
/// </summary>
public sealed record WraithRippleRenderSnapshot(double X, double Y, bool Emerging, double Progress, double Radius);

/// <summary>One mark of a field ambush's tell: the exact spot an enemy with this body Radius will burst out of.</summary>
public sealed record FieldAmbushMarkRenderSnapshot(double X, double Y, double Radius);

/// <summary>A field ambush about to spring: marks on every side of the hunter; Progress runs 0 to 1 over the tell.</summary>
public sealed record FieldAmbushRenderSnapshot(double Progress, IReadOnlyList<FieldAmbushMarkRenderSnapshot> Marks);
