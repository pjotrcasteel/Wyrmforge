namespace Wyrmforge.Application.Runs.Navigation;

/// <summary>
/// Candidate integer-aligned microcell address inside a 1m XYZ terrain block.
/// These are fracture *coordinates*, not 512 allocated entities per intact block.
/// </summary>
public readonly record struct WorldSiteFractureCellAddress(int X, int Y, int Z)
{
    public int SourcePixelX => X * WorldSiteFractureGeometry.SourcePixelsPerMicrocell;
    public int SourcePixelY => Y * WorldSiteFractureGeometry.SourcePixelsPerMicrocell;
    public int SourcePixelZ => Z * WorldSiteFractureGeometry.SourcePixelsPerMicrocell;
}

/// <summary>
/// Proposed 8x8x8 sparse fracture coordinate contract: 12.5cm = four native
/// source pixels along each 32px block edge. 10cm cannot align to 32 pixels.
/// One damaged block needs at most 512 bits (64 bytes) for an occupancy mask;
/// intact blocks require no per-microcell allocation. Art and FX consumers
/// may aggregate removed microcells into authored fragments or bounded debris.
/// </summary>
public static class WorldSiteFractureGeometry
{
    public const int MicrocellsPerEdge = 8;
    public const int MicrocellsPerBlock = MicrocellsPerEdge * MicrocellsPerEdge * MicrocellsPerEdge;
    public const double MicrocellEdgeMeters = WorldSiteStrataGrid.BlockEdgeMeters / MicrocellsPerEdge;
    public const int SourcePixelsPerMicrocell = WorldSiteStrataGrid.NativeSourceTilePixels / MicrocellsPerEdge;

    /// <summary>Pack a local sub-block XYZ address into 0–511 without allocating a 3D array.</summary>
    public static int Pack(int x, int y, int z)
    {
        if ((uint)x >= MicrocellsPerEdge || (uint)y >= MicrocellsPerEdge || (uint)z >= MicrocellsPerEdge)
        {
            throw new ArgumentOutOfRangeException(nameof(x), "Microcell coordinates must be inside a single 1m block.");
        }

        return (z * MicrocellsPerEdge + y) * MicrocellsPerEdge + x;
    }

    /// <summary>Unpack a sparse 0–511 bit index into its local integer XYZ coordinates.</summary>
    public static WorldSiteFractureCellAddress Unpack(int index)
    {
        if ((uint)index >= MicrocellsPerBlock)
        {
            throw new ArgumentOutOfRangeException(nameof(index));
        }

        var x = index % MicrocellsPerEdge;
        var y = index / MicrocellsPerEdge % MicrocellsPerEdge;
        var z = index / (MicrocellsPerEdge * MicrocellsPerEdge);
        return new WorldSiteFractureCellAddress(x, y, z);
    }
}
