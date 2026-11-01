using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;

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
    /// <summary>Zero for seeded geology, increasing for a mutation-state projection.</summary>
    public long Revision { get; init; }

    /// <summary>Project the immutable seeded top layer without creating a second terrain sampler.</summary>
    public static WorldSiteStrataRenderSnapshot FromGrid(WorldSiteStrataGrid grid)
    {
        ArgumentNullException.ThrowIfNull(grid);
        return Build(grid, (x, y) =>
        {
            var z = grid.GetCell(x, y, int.MaxValue).SurfaceZ;
            return grid.GetCell(x, y, z);
        }, revision: 0);
    }

    /// <summary>Project freshly exposed C# stone after damage/removal, without JS guessing layers.</summary>
    public static WorldSiteStrataRenderSnapshot FromMutations(WorldSiteStrataMutationState state)
    {
        ArgumentNullException.ThrowIfNull(state);
        return Build(state.BaseGrid, state.GetExposedSurfaceCell, state.Revision);
    }

    private static WorldSiteStrataRenderSnapshot Build(WorldSiteStrataGrid grid,
        Func<int, int, WorldSiteStrataCell> topAt, long revision)
    {
        var count = checked(grid.Columns * grid.Rows);
        var finishes = new int[count];
        var bodies = new int[count];
        var levels = new int[count];

        for (var y = 0; y < grid.Rows; y++)
        for (var x = 0; x < grid.Columns; x++)
        {
            var index = y * grid.Columns + x;
            var top = topAt(x, y);
            levels[index] = top.Key.Z;
            finishes[index] = top.SurfaceFinish is { } finish ? (int)finish : -1;
            bodies[index] = top.MaterialId;
        }

        return new(grid.SiteId, grid.WorldSeed, WorldSiteStrataGrid.NativeSourceTilePixels,
            grid.Columns, grid.Rows, finishes, bodies, levels) { Revision = revision };
    }
}
