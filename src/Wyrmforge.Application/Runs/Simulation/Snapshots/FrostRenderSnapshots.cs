namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>A Shardcaster's ice lance in flight; the tail runs back to where it was fired.</summary>
public sealed record IceLanceRenderSnapshot(double X, double Y, double Angle, double OriginX, double OriginY);

/// <summary>Splinters waiting to burst where a lance stopped. Charge runs 0→1 to the burst; Fade 0→1 after it.</summary>
public sealed record SplinterBloomRenderSnapshot(double X, double Y, double Radius, double Charge, bool Burst, double Fade);

/// <summary>A slick black ice patch on the ground. Life runs 1→0 until it thaws.</summary>
public sealed record BlackIceRenderSnapshot(double X, double Y, double Radius, double Life);

/// <summary>A Whitefang's snow cloud: where it was, not where it is. Life runs 1→0.</summary>
public sealed record SnowCloudRenderSnapshot(double X, double Y, double Radius, double Life);

/// <summary>A Cairn Sentinel's Avalanche Step: a wave across the front arc (Angle ± HalfAngle); only its edge at Radius hurts.</summary>
public sealed record AvalancheRingRenderSnapshot(double X, double Y, double Radius, double MaxRadius, double Thickness, double Progress,
    double Angle, double HalfAngle);
