using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>
/// Read-only XYZ0 matrix review of C# cells, row-major in XY. Each visible top face
/// carries its actual surface finish, underlying body and integer Z stratum.
/// It is not a second world, a texture lookup, or an input to collision.
/// </summary>
public sealed record WorldSiteStrataRenderSnapshot(
    string SiteId,
    int WorldSeed,
    int TilePixels,
    int Columns,
    int Rows,
    int[] SurfaceMaterialIds,
    int[] BodyMaterialIds,
    int[] SurfaceZ)
{
    public static WorldSiteStrataRenderSnapshot FromGrid(WorldSiteStrataGrid grid)
    {
        ArgumentNullException.ThrowIfNull(grid);
        var count = checked(grid.Columns * grid.Rows);
        var finishes = new int[count];
        var bodies = new int[count];
        var levels = new int[count];

        for (var y = 0; y < grid.Rows; y++)
        for (var x = 0; x < grid.Columns; x++)
        {
            var index = y * grid.Columns + x;
            // The air query exposes the authoritative sampled surface Z, and the
            // following exact cell query resolves both top finish and soil/stone body.
            var z = grid.GetCell(x, y, int.MaxValue).SurfaceZ;
            var top = grid.GetCell(x, y, z);
            levels[index] = z;
            finishes[index] = top.SurfaceFinish is { } finish ? (int)finish : -1;
            bodies[index] = top.MaterialId;
        }

        return new(grid.SiteId, grid.WorldSeed, WorldSiteStrataGrid.NativeSourceTilePixels,
            grid.Columns, grid.Rows, finishes, bodies, levels);
    }
}
