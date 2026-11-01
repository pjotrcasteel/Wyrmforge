namespace Wyrmforge.Application.Runs.Navigation;

/// <summary>
/// One integer world-cell address. XY is a ground-plane cell, Z is a sampled vertical stratum.
/// These are physical cell coordinates, not atlas frame coordinates or a 3D renderer.
/// </summary>
public readonly record struct WorldSiteCellKey(int X, int Y, int Z);

/// <summary>
/// A read-only view of the existing AR3 terrain. Null BodyMaterial means air/outside the site.
/// SurfaceFinish identifies the C# surface at the top only; it is never a saved visual atlas ID.
/// </summary>
public readonly record struct WorldSiteStrataCell(
    WorldSiteCellKey Key,
    WorldSiteSurfaceId? BodyMaterial,
    WorldSiteSurfaceId? SurfaceFinish,
    bool Solid,
    int SurfaceZ,
    double SurfaceHeightMeters)
{
    public bool IsEmpty => BodyMaterial is null;

    /// <summary>Numeric material ID for future 32px art lookup; -1 denotes air.</summary>
    public int MaterialId => BodyMaterial is { } material ? (int)material : -1;
}

/// <summary>
/// XYZ0.1: an on-demand, read-only integer-cell projection of AR3's deterministic height/material sampler.
/// The current C# terrain, movement, obstruction, pathfinding and saves remain authoritative.
/// This is not a writable voxel world, mutation engine or collision replacement.
/// </summary>
public sealed class WorldSiteStrataGrid
{
    public const int NativeSourceTilePixels = 32;

    // AR3's gameplay site uses 950x1550 logical units for 190x310 physical metres.
    // At that established presentation density, one source 32px tile spans 6.4m.
    // This is a PROVISIONAL visual-to-world scale, not an approved excavation unit.
    public const double PreviewCellWidthMeters =
        NativeSourceTilePixels * (WorldSiteElevationField.SiteWidthMeters / 950d);

    // A separate physical vertical unit; never assume a top tile is a 32px-tall cube.
    public const double PreviewStratumHeightMeters = 1;

    private readonly WorldSiteGeography _site;

    public double CellWidthMeters { get; }
    public double StratumHeightMeters { get; }
    public int Columns { get; }
    public int Rows { get; }

    public WorldSiteStrataGrid(WorldSiteGeography site,
        double cellWidthMeters = PreviewCellWidthMeters,
        double stratumHeightMeters = PreviewStratumHeightMeters)
    {
        ArgumentNullException.ThrowIfNull(site);
        if (!double.IsFinite(cellWidthMeters) || cellWidthMeters <= 0 ||
            cellWidthMeters < WorldSiteElevationField.SiteWidthMeters / 4096d)
            throw new ArgumentOutOfRangeException(nameof(cellWidthMeters));
        if (!double.IsFinite(stratumHeightMeters) || stratumHeightMeters <= 0 ||
            stratumHeightMeters < .001)
            throw new ArgumentOutOfRangeException(nameof(stratumHeightMeters));

        _site = site;
        CellWidthMeters = cellWidthMeters;
        StratumHeightMeters = stratumHeightMeters;
        Columns = (int)Math.Ceiling(WorldSiteElevationField.SiteWidthMeters / CellWidthMeters);
        Rows = (int)Math.Ceiling(WorldSiteElevationField.SiteLengthMeters / CellWidthMeters);
        if (Rows > 4096)
            throw new ArgumentOutOfRangeException(nameof(cellWidthMeters), "The read-only grid exceeds 4096 rows.");
    }

    /// <summary>
    /// Query an arbitrary XYZ cell without generating a dense 3D volume.
    /// For the initial soil-over-stone read-only reference, the top material is a C# cover
    /// (grass/road/mud/soil/rock/water/ice), one soil body is present under soft covers,
    /// and lower strata resolve to rock. A future C# layer-delta replaces this provisional
    /// geology only after independent simulation/route/save acceptance.
    /// </summary>
    public WorldSiteStrataCell GetCell(int x, int y, int z)
    {
        var key = new WorldSiteCellKey(x, y, z);
        if (x < 0 || y < 0 || x >= Columns || y >= Rows)
            return new WorldSiteStrataCell(key, null, null, false, 0, 0);

        // The rightmost/bottommost partial cells still sample *inside* the C# site.
        var point = new HuntPoint(
            Math.Min((x + .5) * CellWidthMeters / WorldSiteElevationField.SiteWidthMeters, 1),
            Math.Min((y + .5) * CellWidthMeters / WorldSiteElevationField.SiteLengthMeters, 1));
        var surface = WorldSiteElevationField.Sample(_site, point);
        var topZ = checked((int)Math.Floor(surface.HeightMeters / StratumHeightMeters));

        if (z > topZ)
            return new WorldSiteStrataCell(key, null, null, false, topZ, surface.HeightMeters);

        if (z < topZ)
            return new WorldSiteStrataCell(key, WorldSiteSurfaceId.Rock, null, true,
                topZ, surface.HeightMeters);

        var body = surface.Material switch
        {
            WorldSiteSurfaceId.Soil or WorldSiteSurfaceId.Grass or
                WorldSiteSurfaceId.Road or WorldSiteSurfaceId.Mud => WorldSiteSurfaceId.Soil,
            _ => surface.Material,
        };
        return new WorldSiteStrataCell(key, body, surface.Material,
            body != WorldSiteSurfaceId.ShallowWater, topZ, surface.HeightMeters);
    }
}
