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
    /// <summary>Line of sight and shots clear terrain up to 1.25 m above the shooter's ground.</summary>
    public const int ShotClearanceMicrocells = 10;
    /// <summary>Excavation never digs below this floor: -4 m.</summary>
    public const int BedrockMicrocells = -32;
    /// <summary>Soil and ash lie one metre deep over stone, which only the heaviest impacts can dent.</summary>
    public const int SoilDepthMicrocells = 8;

    private readonly short[] surface;
    private readonly short[] stoneTop;
    private readonly ArenaTerrainMaterial[] materials;

    public ArenaTerrainGrid(int columns, int rows)
    {
        if (columns <= 0 || rows <= 0) throw new ArgumentOutOfRangeException(nameof(columns));
        Columns = columns;
        Rows = rows;
        surface = new short[columns * rows];
        stoneTop = new short[columns * rows];
        Array.Fill(stoneTop, (short)-SoilDepthMicrocells);
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
        var clamped = (short)Math.Clamp(surfaceMicrocells, BedrockMicrocells, short.MaxValue);
        surface[row * Columns + column] = clamped;
        materials[row * Columns + column] = material;
        // Soil and ash cover stone one metre down; stone and lava columns are solid at their surface.
        stoneTop[row * Columns + column] = (short)(material is ArenaTerrainMaterial.Soil or ArenaTerrainMaterial.Ash
            ? Math.Max(BedrockMicrocells, clamped - SoilDepthMicrocells) : clamped);
        Revision++;
    }

    /// <summary>Height at which soil gives way to stone in this column.</summary>
    public int StoneTop(int column, int row) => stoneTop[row * Columns + column];

    /// <summary>Copy of the current heightfield for presentation; the caller cannot change the authoritative grid.</summary>
    public Wyrmforge.Application.Runs.Simulation.Snapshots.ArenaTerrainFrame ToFrame() =>
        new(Revision, Columns, Rows, (short[])surface.Clone(), materials.Select(material => (int)material).ToArray());

    public ArenaTerrainGrid Clone()
    {
        var copy = new ArenaTerrainGrid(Columns, Rows) { Revision = Revision };
        surface.CopyTo(copy.surface, 0);
        stoneTop.CopyTo(copy.stoneTop, 0);
        materials.CopyTo(copy.materials, 0);
        return copy;
    }

    /// <summary>
    /// Lower a column by up to <paramref name="soil"/> microcells of soil and <paramref name="stone"/> of stone.
    /// Soil that is dug through exposes stone; bedrock and lava never change. Returns the microcells actually removed.
    /// </summary>
    public int Excavate(int column, int row, int soil, int stone, int floor = BedrockMicrocells)
    {
        if (!Contains(column, row)) return 0;
        var index = row * Columns + column;
        if (materials[index] == ArenaTerrainMaterial.Lava) return 0;
        int start = surface[index];
        int current = start;
        floor = Math.Max(floor, BedrockMicrocells);
        if (materials[index] is ArenaTerrainMaterial.Soil or ArenaTerrainMaterial.Ash)
        {
            var dug = Math.Min(Math.Max(0, soil), Math.Max(0, current - Math.Max(stoneTop[index], floor)));
            current -= dug;
            if (current <= stoneTop[index]) materials[index] = ArenaTerrainMaterial.Stone;
        }
        if (materials[index] == ArenaTerrainMaterial.Stone && stone > 0 && current > floor)
            current -= Math.Min(stone, current - floor);
        if (current == start) return 0;
        surface[index] = (short)current;
        Revision++;
        return start - current;
    }

    /// <summary>Restore a recorded column exactly; used by save and replay, never by gameplay.</summary>
    public void Restore(int column, int row, int surfaceMicrocells, ArenaTerrainMaterial material)
    {
        var index = row * Columns + column;
        var kept = stoneTop[index];
        Set(column, row, surfaceMicrocells, material);
        stoneTop[index] = kept;
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

    /// <summary>
    /// Sight and shots travel 1.25 m above the shooter's ground: any column on the way, other than the shooter's own,
    /// that rises above that height blocks them. Pits and low steps never do.
    /// </summary>
    public bool BlocksSight(Vector2D from, Vector2D to)
    {
        var (fromColumn, fromRow) = ColumnOf(from);
        if (!Contains(fromColumn, fromRow)) return false;
        var ceiling = Surface(fromColumn, fromRow) + ShotClearanceMicrocells;
        var steps = Math.Max(1, (int)Math.Ceiling(Vector2D.Distance(from, to) / 8));
        for (var step = 1; step <= steps; step++)
        {
            var (column, row) = ColumnOf(from + (to - from) * (step / (double)steps));
            if ((column == fromColumn && row == fromRow) || !Contains(column, row)) continue;
            if (Surface(column, row) > ceiling) return true;
        }
        return false;
    }

    /// <summary>Every column an actor of this radius can walk to from the start, by the same rule as movement.</summary>
    public bool[] ReachableFrom((int Column, int Row) start, double radius)
    {
        var seen = new bool[Columns * Rows];
        if (!Contains(start.Column, start.Row)) return seen;
        var queue = new Queue<(int Column, int Row)>();
        queue.Enqueue(start);
        seen[start.Row * Columns + start.Column] = true;
        while (queue.Count > 0)
        {
            var (column, row) = queue.Dequeue();
            for (var dy = -1; dy <= 1; dy++)
                for (var dx = -1; dx <= 1; dx++)
                {
                    var (nc, nr) = (column + dx, row + dy);
                    if ((dx == 0 && dy == 0) || !Contains(nc, nr) || seen[nr * Columns + nc]) continue;
                    if (!CanWalk(column, row, nc, nr, radius)) continue;
                    seen[nr * Columns + nc] = true;
                    queue.Enqueue((nc, nr));
                }
        }
        return seen;
    }

    /// <summary>
    /// Walking cost from every column to the goal (Dijkstra, 8-neighbour, no corner cutting), using the same
    /// standability and step rules as movement. Unreachable columns keep <see cref="Unreachable"/>.
    /// </summary>
    public int[] DistanceFrom((int Column, int Row) goal, double radius)
    {
        var cost = new int[Columns * Rows];
        Array.Fill(cost, Unreachable);
        if (!Contains(goal.Column, goal.Row)) return cost;
        var open = new PriorityQueue<(int Column, int Row), int>();
        cost[goal.Row * Columns + goal.Column] = 0;
        open.Enqueue(goal, 0);
        while (open.TryDequeue(out var cell, out var spent))
        {
            if (spent > cost[cell.Row * Columns + cell.Column]) continue;
            for (var dy = -1; dy <= 1; dy++)
                for (var dx = -1; dx <= 1; dx++)
                {
                    var (nc, nr) = (cell.Column + dx, cell.Row + dy);
                    if ((dx == 0 && dy == 0) || !Contains(nc, nr) || !CanWalk(cell.Column, cell.Row, nc, nr, radius)) continue;
                    var next = spent + (dx != 0 && dy != 0 ? 14 : 10);
                    if (next >= cost[nr * Columns + nc]) continue;
                    cost[nr * Columns + nc] = next;
                    open.Enqueue((nc, nr), next);
                }
        }
        return cost;
    }

    public const int Unreachable = int.MaxValue;

    private bool CanWalk(int fromColumn, int fromRow, int column, int row, double radius)
    {
        if (!IsStandable(CenterOf(column, row), radius)) return false;
        return CanStepBetween(fromColumn, fromRow, column, row);
    }

    // A diagonal passes the shared corner, so both corner columns must be climbable to and from both ends.
    private bool CanStepBetween(int fromColumn, int fromRow, int column, int row)
    {
        if (Math.Abs(Surface(fromColumn, fromRow) - Surface(column, row)) > MaxStepMicrocells) return false;
        if (column == fromColumn || row == fromRow) return true;
        return Linked(fromColumn, fromRow, column, fromRow) && Linked(column, fromRow, column, row) &&
            Linked(fromColumn, fromRow, fromColumn, row) && Linked(fromColumn, row, column, row);
    }

    private bool Linked(int fromColumn, int fromRow, int column, int row) =>
        Math.Abs(Surface(fromColumn, fromRow) - Surface(column, row)) <= MaxStepMicrocells && Material(column, row) != ArenaTerrainMaterial.Lava;

    /// <summary>
    /// Along the downhill path of a distance field, the farthest column within <paramref name="lookahead"/> steps that can be
    /// walked to in a straight line, so chasers cut no corners through rock; null when the field leads nowhere.
    /// </summary>
    public Vector2D? NextWaypoint(int[] cost, Vector2D from, double radius, int lookahead)
    {
        var (column, row) = ColumnOf(from);
        if (!Contains(column, row) || cost[row * Columns + column] == Unreachable) return null;
        Vector2D? first = null;
        Vector2D? farthest = null;
        for (var step = 0; step < lookahead; step++)
        {
            var here = cost[row * Columns + column];
            if (here == 0) break;
            var best = (Column: column, Row: row, Cost: here);
            for (var dy = -1; dy <= 1; dy++)
                for (var dx = -1; dx <= 1; dx++)
                {
                    var (nc, nr) = (column + dx, row + dy);
                    if ((dx == 0 && dy == 0) || !Contains(nc, nr)) continue;
                    var next = cost[nr * Columns + nc];
                    if (next < best.Cost && CanStepBetween(column, row, nc, nr)) best = (nc, nr, next);
                }
            if (best.Cost == here) break;
            (column, row) = (best.Column, best.Row);
            var centre = CenterOf(column, row);
            if (first is null) first = centre;
            if (!BlocksMovement(from, centre, radius)) farthest = centre;
        }
        return farthest ?? first;
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
                    if (!CanWalk(column, row, nc, nr, radius)) continue;
                    seen[nr * Columns + nc] = true;
                    queue.Enqueue((nc, nr));
                }
        }
        return false;
    }
}
