namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>
/// The Bell Warden's presence: the marked spot while the bell tolls ("tolling", progress 0→1), then the fight ("fight") with its
/// health bar and the crack at half strength.
/// </summary>
public sealed record BellWardenRenderSnapshot(string Stage, double X, double Y, double Progress, double HealthRatio, bool Cracked, double CrackProgress,
    string Variant = "fire");

/// <summary>
/// A bell smash's aftermath: the crater (ImpactRadius) holds while the ring charges (Charge 0→1), then the shockwave front rolls out
/// to the marked outer ring (MaxRadius). Only the front hurts.
/// </summary>
public sealed record BellShockwaveRenderSnapshot(double X, double Y, double Radius, double ImpactRadius, double MaxRadius, double Charge, bool Expanding)
{
    /// <summary>Seconds since the authoritative smash occurred; times cosmetic impact frames without repeat triggers.</summary>
    public double AgeSeconds { get; init; }

    /// <summary>Authoritative ground surface elevation in world units for 2.5D impact projection.</summary>
    public double Z { get; init; }
}
