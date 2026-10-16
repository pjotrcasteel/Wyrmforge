namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>
/// The Reliquary's presence: a sigil while the world hushes ("hush"), the figure rising out of it ("emerging"), then the duel
/// ("duel") with its health bar. Progress runs 0→1 through the hush and the emergence.
/// </summary>
public sealed record ReliquaryRenderSnapshot(string Stage, double X, double Y, double Progress, double HealthRatio, bool Shifted, bool Warded,
    double ShiftProgress);

/// <summary>A corruption field: a pale arming ring, then a live pool that burns the hunter inside it. Life runs 1→0 once live.</summary>
public sealed record ReliquaryFieldRenderSnapshot(double X, double Y, double Radius, bool Armed, double ArmProgress, double Life);
