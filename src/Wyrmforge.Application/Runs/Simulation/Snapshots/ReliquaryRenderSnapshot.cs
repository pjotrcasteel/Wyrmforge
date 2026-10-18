namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>
/// The Reliquary's presence: a sigil while the world hushes ("hush"), the figure rising out of it ("emerging"), then the duel
/// ("duel") with its health bar. Progress runs 0→1 through the hush and the emergence. Variant is "fire" for the Reliquary and
/// "glass" for the Frost region's Reliquary of Glass, which can also be veiled among false forms or exposed after the veil breaks.
/// </summary>
public sealed record ReliquaryRenderSnapshot(string Stage, double X, double Y, double Progress, double HealthRatio, bool Shifted, bool Warded,
    double ShiftProgress, string Variant = "fire", bool Veiled = false, bool Exposed = false);

/// <summary>A Crystal Ward's light tether from the pylon to the Reliquary of Glass. Lit runs 0→1 while it kindles; at 1 it burns.</summary>
public sealed record GlassTetherRenderSnapshot(double X1, double Y1, double X2, double Y2, double HalfWidth, double Lit);

/// <summary>
/// A Glacial Prison: a marked ring that rises (Rise 0→1) into an ice cage, then stands (Life 1→0). Trapped is true when the hunter
/// was inside when it closed.
/// </summary>
public sealed record GlassPrisonRenderSnapshot(double X, double Y, double Radius, double Rise, bool Risen, double Life, bool Trapped);

/// <summary>A corruption field: a pale arming ring, then a live pool that burns the hunter inside it. Life runs 1→0 once live.</summary>
public sealed record ReliquaryFieldRenderSnapshot(double X, double Y, double Radius, bool Armed, double ArmProgress, double Life);
