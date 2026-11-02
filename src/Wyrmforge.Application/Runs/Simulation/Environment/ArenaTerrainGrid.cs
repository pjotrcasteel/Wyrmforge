using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public enum ArenaTerrainMaterial : byte { Soil, Ash, Stone, Lava }

/// <summary>
/// Authoritative arena heightfield: one column per metre (32 world units), heights in 12.5 cm microcells.
/// Only the C# simulation mutates it; presentation reads chunks by <see cref="Revision"/>.
/// </summary>
public sealed class ArenaTerrainGrid
{
    public const double CellUnits = ArenaMetricEnvelope.UnitsPerMeter;
    public const int MicrocellsPerMeter = 8;
    public const double MicrocellUnits = CellUnits / MicrocellsPerMeter;
    /// <summary>The tallest step an actor climbs or drops between neighbouring columns: 0.5 m.</summary>
    public const int MaxStepMicrocells = 4;
    /// <summary>Excavation never digs below this floor: -4 m.</summary>
    public const int BedrockMicrocells = -32;

    private readonly short[] surface;
    private readonly ArenaTerrainMaterial[] materials;

    public ArenaTerrainGrid(int columns, int rows)
    {
        if (columns <= 0 || rows <= 0) throw new ArgumentOutOfRangeException(nameof(columns));
        Columns = columns;
        Rows = rows;
        surface = new short[columns * rows];
        materials = new ArenaTerrainMaterial[columns * rows];
    }

    public int Columns { get; }
    public int Rows { get; }
    /// <summary>Increments on every change so presentation can pull only what moved.</summary>
    public int Revision { get; private set; }

    public bool Contains(int column, int row) => column >= 0 && column < Columns && row >= 0 && row < Rows;
    public int Surface(int column, int row) => surface[row * Columns + column];
    public ArenaTerrainMaterial Material(int column, int row) => materials[row * Columns + column];
    public double SurfaceMeters(int column, int row) => Surface(column, row) / (double)MicrocellsPerMeter;

    public void Set(int column, int row, int surfaceMicrocells, ArenaTerrainMaterial material)
    {
        if (!Contains(column, row)) throw new ArgumentOutOfRangeException(nameof(column));
        surface[row * Columns + column] = (short)Math.Clamp(surfaceMicrocells, BedrockMicrocells, short.MaxValue);
        materials[row * Columns + column] = material;
        Revision++;
    }

    public static (int Column, int Row) ColumnOf(Vector2D position) =>
        ((int)Math.Floor(position.X / CellUnits), (int)Math.Floor(position.Y / CellUnits));

    public static Vector2D CenterOf(int column, int row) => new((column + .5) * CellUnits, (row + .5) * CellUnits);

    /// <summary>Height of the ground under a point, or null outside the arena.</summary>
    public double? SurfaceMetersAt(Vector2D position)
    {
        var (column, row) = ColumnOf(position);
        return Contains(column, row) ? SurfaceMeters(column, row) : null;
    }

    /// <summary>
    /// A circular footprint is standable when every column it overlaps is inside the arena, not lava,
    /// and within one step of the column under its centre.
    /// </summary>
    public bool IsStandable(Vector2D position, double radius)
    {
        var (column, row) = ColumnOf(position);
        if (!Contains(column, row)) return false;
        var centre = Surface(column, row);
        var minColumn = (int)Math.Floor((position.X - radius) / CellUnits);
        var maxColumn = (int)Math.Floor((position.X + radius) / CellUnits);
        var minRow = (int)Math.Floor((position.Y - radius) / CellUnits);
        var maxRow = (int)Math.Floor((position.Y + radius) / CellUnits);
        for (var y = minRow; y <= maxRow; y++)
            for (var x = minColumn; x <= maxColumn; x++)
            {
                if (!Contains(x, y)) return false;
                if (Material(x, y) == ArenaTerrainMaterial.Lava) return false;
                if (Math.Abs(Surface(x, y) - centre) > MaxStepMicrocells) return false;
            }
        return Material(column, row) != ArenaTerrainMaterial.Lava;
    }

    /// <summary>Walk from a to b in 8-unit samples; blocks at the first non-standable footprint or oversized step.</summary>
    public bool BlocksMovement(Vector2D from, Vector2D to, double radius)
    {
        var distance = Vector2D.Distance(from, to);
        var steps = Math.Max(1, (int)Math.Ceiling(distance / 8));
        var previous = from;
        for (var step = 1; step <= steps; step++)
        {
            var point = from + (to - from) * (step / (double)steps);
            if (!IsStandable(point, radius)) return true;
            var (pc, pr) = ColumnOf(previous);
            var (c, r) = ColumnOf(point);
            if ((pc != c || pr != r) && Math.Abs(Surface(pc, pr) - Surface(c, r)) > MaxStepMicrocells) return true;
            previous = point;
        }
        return false;
    }

    /// <summary>Resolve a proposed move: the full move, a slide along one axis, or no move.</summary>
    public Vector2D RestrictMovement(Vector2D previous, Vector2D proposed, double radius)
    {
        if (!BlocksMovement(previous, proposed, radius)) return proposed;
        var slideX = new Vector2D(proposed.X, previous.Y);
        if (!BlocksMovement(previous, slideX, radius)) return slideX;
        var slideY = new Vector2D(previous.X, proposed.Y);
        return !BlocksMovement(previous, slideY, radius) ? slideY : previous;
    }

    /// <summary>Breadth-first reachability between two column centres using the same standability rule actors obey.</summary>
    public bool IsReachable((int Column, int Row) start, (int Column, int Row) goal, double radius)
    {
        if (!Contains(start.Column, start.Row) || !Contains(goal.Column, goal.Row)) return false;
        var seen = new bool[Columns * Rows];
        var queue = new Queue<(int Column, int Row)>();
        queue.Enqueue(start);
        seen[start.Row * Columns + start.Column] = true;
        while (queue.Count > 0)
        {
            var (column, row) = queue.Dequeue();
            if (column == goal.Column && row == goal.Row) return true;
            for (var dy = -1; dy <= 1; dy++)
                for (var dx = -1; dx <= 1; dx++)
                {
                    var (nc, nr) = (column + dx, row + dy);
                    if ((dx == 0 && dy == 0) || !Contains(nc, nr) || seen[nr * Columns + nc]) continue;
                    if (!IsStandable(CenterOf(nc, nr), radius)) continue;
                    if (Math.Abs(Surface(column, row) - Surface(nc, nr)) > MaxStepMicrocells) continue;
                    seen[nr * Columns + nc] = true;
                    queue.Enqueue((nc, nr));
                }
        }
        return false;
    }
}
