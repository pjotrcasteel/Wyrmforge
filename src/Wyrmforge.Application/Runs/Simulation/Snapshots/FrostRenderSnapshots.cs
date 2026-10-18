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

/// <summary>A fallen Frostling's rime husk, waiting for a Hoarfrost Cantor to reknit it. Life runs 1 → 0 as it thaws.</summary>
public sealed record RimeHuskRenderSnapshot(double X, double Y, double Life);

/// <summary>A permafrost scar a Bell of Winter slam left: a frozen band from X1/Y1 to X2/Y2. Life runs 1→0 until it thaws or is recalled.</summary>
public sealed record PermafrostScarRenderSnapshot(double X1, double Y1, double X2, double Y2, double HalfWidth, double Life);

/// <summary>
/// A Winter Toll ring rolling out from the bell. Charge runs 0→1 before it leaves the bell; then only its edge at Radius hurts, except
/// inside the open lanes centred on GapAngles (each ± GapHalfAngle).
/// </summary>
public sealed record WinterRingRenderSnapshot(double X, double Y, double Radius, double MaxRadius, double Thickness, double Charge,
    IReadOnlyList<double> GapAngles, double GapHalfAngle);

/// <summary>A marked shard called down by Icicle Recall. Progress runs 0→1 to the fall; Fade 0→1 after it shatters.</summary>
public sealed record IcicleRenderSnapshot(double X, double Y, double Radius, double Progress, bool Fallen, double Fade);
