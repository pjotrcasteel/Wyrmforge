using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>Gameplay fuel policy for the authoritative voxel surface. Does not read presentation-only grass or mud textures.</summary>
internal enum AshfangFireFuel : byte
{
    Inert,
    DampOrganic,
    DryOrganic,
    Wood,
}

internal static class AshfangFireFuelRules
{
    private const int MoisturePocketCells = 3;
    private const uint DryThresholdPercent = 42;

    public static AshfangFireFuel At(ArenaTerrainGrid grid, Vector2D position)
    {
        var (column, row) = ArenaTerrainGrid.ColumnOf(position);
        if (!grid.Contains(column, row)) return AshfangFireFuel.Inert;

        // Read the exact exposed microcolumn: digging through earth to stone extinguishes its available fuel.
        var microX = Math.Clamp((int)Math.Floor((position.X - column * ArenaTerrainGrid.CellUnits) /
            ArenaTerrainGrid.MicroUnits), 0, ArenaTerrainGrid.MicroPerColumn - 1);
        var microY = Math.Clamp((int)Math.Floor((position.Y - row * ArenaTerrainGrid.CellUnits) /
            ArenaTerrainGrid.MicroUnits), 0, ArenaTerrainGrid.MicroPerColumn - 1);
        var surface = grid.MicroMaterial(column, row, microX, microY);
        if (surface == ArenaTerrainMaterial.Wood)
        {
            // Digging/collapsing a trunk down to its base removes the fuel; don't keep a ghost fire.
            return grid.MicroSurface(column, row, microX, microY) > 0 ? AshfangFireFuel.Wood : AshfangFireFuel.Inert;
        }
        if (surface != ArenaTerrainMaterial.Soil) return AshfangFireFuel.Inert;

        // A stable physical moisture pocket, independent of visual grass/mud noise and terrain revisions.
        // Nearby cells share their dryness so spread forms short coherent tongues rather than a checkerboard.
        var pocketX = column / MoisturePocketCells;
        var pocketY = row / MoisturePocketCells;
        var hash = unchecked((uint)grid.FireMoistureSeed ^ (uint)(pocketX * 73856093) ^ (uint)(pocketY * 19349663));
        hash = unchecked((hash ^ (hash >> 16)) * 0x7FEB352Du);
        hash = unchecked((hash ^ (hash >> 15)) * 0x846CA68Bu);
        hash ^= hash >> 16;
        return hash % 100 < DryThresholdPercent ? AshfangFireFuel.DryOrganic : AshfangFireFuel.DampOrganic;
    }

    public static bool CanSpread(AshfangFireFuel fuel) => fuel is AshfangFireFuel.DryOrganic or AshfangFireFuel.Wood;

    /// <summary>Fire cannot jump across cliffs. A trunk may ignite from soil at its base but not a distant high ledge.</summary>
    public static bool CanCrossHeight(ArenaTerrainGrid grid, Vector2D from, Vector2D to,
        AshfangFireFuel sourceFuel, AshfangFireFuel destinationFuel)
    {
        var (sourceColumn, sourceRow) = ArenaTerrainGrid.ColumnOf(from);
        var (targetColumn, targetRow) = ArenaTerrainGrid.ColumnOf(to);
        if (!grid.Contains(sourceColumn, sourceRow) || !grid.Contains(targetColumn, targetRow)) return false;
        var difference = Math.Abs(grid.Surface(sourceColumn, sourceRow) - grid.Surface(targetColumn, targetRow));
        if (difference <= ArenaTerrainGrid.MaxStepMicrocells) return true;
        // Wood columns model standing trunks, not floating platforms; allow flame up the bark only.
        return (sourceFuel == AshfangFireFuel.Wood || destinationFuel == AshfangFireFuel.Wood) &&
            difference <= ArenaTerrainGrid.SoilDepthMicrocells * 3;
    }
}
