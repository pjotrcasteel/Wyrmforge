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
    /// <summary>Soil and ash lie one metre deep over stone, which wears away under repeated impacts instead of resisting them.</summary>
    public const int SoilDepthMicrocells = 8;
    /// <summary>Impact points a microcolumn of stone absorbs before one 12.5 cm microcell breaks off. Proposed value: tune in playtests.</summary>
    public const int StoneWearPerMicrocell = 2;
    /// <summary>Every metre column can be subdivided into 8 x 8 microcolumns of 4 units (12.5 cm) when damaged.</summary>
    public const int MicroPerColumn = 8;
    public const int MicroCount = MicroPerColumn * MicroPerColumn;
    public const double MicroUnits = CellUnits / MicroPerColumn;

    private readonly short[] surface;
    private readonly short[] stoneTop;
    private readonly ArenaTerrainMaterial[] materials;
    // The original soil or ash of a column, so dug-through ground can show dirt beside stone; stone and lava keep their own.
    private readonly ArenaTerrainMaterial[] topsoil;
    // Sparse fine overlay: only columns an impact has touched hold 64 microcolumn heights; the rest stay one value.
    private readonly Dictionary<int, short[]> fine = [];
    private readonly Dictionary<int, int> fineChangedAt = [];
    // Accumulated impact points on stone per microcolumn (0 to StoneWearPerMicrocell - 1); part of the authoritative, saved state.
    private readonly Dictionary<int, byte[]> wear = [];

    public ArenaTerrainGrid(int columns, int rows)
    {
        if (columns <= 0 || rows <= 0) throw new ArgumentOutOfRangeException(nameof(columns));
        Columns = columns;
        Rows = rows;
        surface = new short[columns * rows];
        stoneTop = new short[columns * rows];
        Array.Fill(stoneTop, (short)-SoilDepthMicrocells);
        materials = new ArenaTerrainMaterial[columns * rows];
        topsoil = new ArenaTerrainMaterial[columns * rows];
    }

    public int Columns { get; }
    public int Rows { get; }
    /// <summary>
    /// The generated heat-crack network in global microcell coordinates: each path is x, y pairs of 4-adjacent cells. It is part of the
    /// generated baseline, so it is not saved; presentation draws it and gameplay may later read it (Wyrm fissures).
    /// </summary>
    public IReadOnlyList<int[]> Cracks { get; private set; } = [];
    /// <summary>Seeds purely visual ground variety (which patches are mud, dry grass or rubble); gameplay never reads it.</summary>
    public int VisualSeed { get; private set; }
    public void SetVisualSeed(int seed) => VisualSeed = seed;
    public void SetCracks(IReadOnlyList<int[]> cracks) => Cracks = cracks;
    /// <summary>Increments on every change so presentation can pull only what moved.</summary>
    public int Revision { get; private set; }

    public bool Contains(int column, int row) => column >= 0 && column < Columns && row >= 0 && row < Rows;
    public int Surface(int column, int row) => surface[row * Columns + column];
    public ArenaTerrainMaterial Material(int column, int row) => materials[row * Columns + column];
    public double SurfaceMeters(int column, int row) => Surface(column, row) / (double)MicrocellsPerMeter;

    public void Set(int column, int row, int surfaceMicrocells, ArenaTerrainMaterial material)
    {
        if (!Contains(column, row)) throw new ArgumentOutOfRangeException(nameof(column));
        var index = row * Columns + column;
        var clamped = (short)Math.Clamp(surfaceMicrocells, BedrockMicrocells, short.MaxValue);
        surface[index] = clamped;
        materials[index] = material;
        topsoil[index] = material;
        // Soil and ash cover stone one metre down; stone and lava columns are solid at their surface.
        stoneTop[index] = (short)(material is ArenaTerrainMaterial.Soil or ArenaTerrainMaterial.Ash
            ? Math.Max(BedrockMicrocells, clamped - SoilDepthMicrocells) : clamped);
        Revision++;
        wear.Remove(index);
        if (fine.Remove(index)) fineChangedAt[index] = Revision;
    }

    /// <summary>Height at which soil gives way to stone in this column.</summary>
    public int StoneTop(int column, int row) => stoneTop[row * Columns + column];

    /// <summary>True when an impact has subdivided this column.</summary>
    public bool IsSubdivided(int column, int row) => fine.ContainsKey(row * Columns + column);

    /// <summary>Height of one 12.5 cm microcolumn (0-7 on each axis); a whole column reads as one value until it is damaged.</summary>
    public int MicroSurface(int column, int row, int microX, int microY)
    {
        var index = row * Columns + column;
        return fine.TryGetValue(index, out var heights) ? heights[microY * MicroPerColumn + microX] : surface[index];
    }

    /// <summary>The material of one microcolumn: stone at or below the stone line, otherwise the column's topsoil.</summary>
    public ArenaTerrainMaterial MicroMaterial(int column, int row, int microX, int microY)
    {
        var index = row * Columns + column;
        if (topsoil[index] is ArenaTerrainMaterial.Stone or ArenaTerrainMaterial.Lava) return topsoil[index];
        return MicroSurface(column, row, microX, microY) <= stoneTop[index] ? ArenaTerrainMaterial.Stone : topsoil[index];
    }

    /// <summary>A copy of a column's 64 microcolumn heights, or null when it is not subdivided.</summary>
    public short[]? FineHeights(int column, int row) =>
        fine.TryGetValue(row * Columns + column, out var heights) ? (short[])heights.Clone() : null;

    /// <summary>A copy of a column's 64 stone wear counters, or null when the column has taken no stone damage.</summary>
    public byte[]? FineWear(int column, int row) =>
        wear.TryGetValue(row * Columns + column, out var counters) ? (byte[])counters.Clone() : null;

    /// <summary>
    /// When a shot stopped at <paramref name="contact"/> travelling along <paramref name="direction"/> because it met rock rising above
    /// the height it flew at, returns that height in microcells (the shooter's ground plus the shot clearance); otherwise null.
    /// That is a side hit on a wall or cliff face, as opposed to a hit from above on open ground.
    /// </summary>
    public int? FaceHitHeight(Vector2D from, Vector2D contact, Vector2D direction)
    {
        var (fromColumn, fromRow) = ColumnOf(from);
        if (!Contains(fromColumn, fromRow) || direction.Length < 1e-9) return null;
        var ceiling = Surface(fromColumn, fromRow) + ShotClearanceMicrocells;
        foreach (var probe in new[] { contact, contact + direction * (CellUnits * .4) })
        {
            var (column, row) = ColumnOf(probe);
            if ((column == fromColumn && row == fromRow) || !Contains(column, row)) continue;
            if (Surface(column, row) > ceiling) return ceiling;
        }
        return null;
    }

    /// <summary>Copy of the current heightfield for presentation; the caller cannot change the authoritative grid.</summary>
    public Wyrmforge.Application.Runs.Simulation.Snapshots.ArenaTerrainFrame ToFrame(int knownRevision = -1)
    {
        var blocks = new List<Wyrmforge.Application.Runs.Simulation.Snapshots.ArenaTerrainFineBlock>();
        foreach (var index in fineChangedAt.Keys.Order())
        {
            if (fineChangedAt[index] <= knownRevision) continue;
            if (knownRevision < 0 && !fine.ContainsKey(index)) continue;
            blocks.Add(fine.TryGetValue(index, out var heights)
                ? new(index, (short[])heights.Clone(), (int)topsoil[index], stoneTop[index],
                    wear.TryGetValue(index, out var counters) ? counters.Select(counter => (int)counter).ToArray() : null)
                : new(index, [], (int)topsoil[index], stoneTop[index]));
        }
        return new(Revision, Columns, Rows, (short[])surface.Clone(), materials.Select(material => (int)material).ToArray(), blocks, knownRevision < 0 ? Cracks : null, VisualSeed);
    }

    public ArenaTerrainGrid Clone()
    {
        var copy = new ArenaTerrainGrid(Columns, Rows) { Revision = Revision, Cracks = Cracks, VisualSeed = VisualSeed };
        surface.CopyTo(copy.surface, 0);
        stoneTop.CopyTo(copy.stoneTop, 0);
        materials.CopyTo(copy.materials, 0);
        topsoil.CopyTo(copy.topsoil, 0);
        foreach (var (index, heights) in fine) copy.fine[index] = (short[])heights.Clone();
        foreach (var (index, counters) in wear) copy.wear[index] = (byte[])counters.Clone();
        foreach (var (index, revision) in fineChangedAt) copy.fineChangedAt[index] = revision;
        return copy;
    }

    /// <summary>
    /// Lower one 12.5 cm microcolumn: soil first down to the stone line, then stone, which wears: every impact point left over
    /// after the soil adds wear and each <see cref="StoneWearPerMicrocell"/> points break one microcell, down to the floor (bedrock at most).
    /// Raised rock, cliffs and walls are stone columns and wear the same way. The column is subdivided on its first hit.
    /// Returns the microcells removed from this microcolumn.
    /// </summary>
    public int ExcavateMicro(int column, int row, int microX, int microY, int impactDepth, int floor = BedrockMicrocells, bool deferRefresh = false)
    {
        if (!Contains(column, row) || microX is < 0 or >= MicroPerColumn || microY is < 0 or >= MicroPerColumn) return 0;
        var index = row * Columns + column;
        if (topsoil[index] == ArenaTerrainMaterial.Lava || materials[index] == ArenaTerrainMaterial.Lava) return 0;
        floor = Math.Max(floor, BedrockMicrocells);
        var micro = microY * MicroPerColumn + microX;
        var heights = fine.TryGetValue(index, out var existing) ? existing : null;
        int start = heights is null ? surface[index] : heights[micro];
        int current = start;
        var points = Math.Max(0, impactDepth);
        if (topsoil[index] is ArenaTerrainMaterial.Soil or ArenaTerrainMaterial.Ash)
        {
            var soilRemoved = Math.Min(points, Math.Max(0, current - Math.Max(stoneTop[index], floor)));
            current -= soilRemoved;
            // Only the points the soil did not absorb reach the stone, and only once the stone line is exposed.
            points = current <= stoneTop[index] ? points - soilRemoved : 0;
        }
        var wearChanged = false;
        if (points > 0 && current > floor)
        {
            var counters = wear.TryGetValue(index, out var held) ? held : null;
            var total = (counters?[micro] ?? 0) + points;
            var broken = total / StoneWearPerMicrocell;
            var dropped = Math.Min(broken, current - floor);
            current -= dropped;
            // Wear carries over until a microcell breaks; at the floor there is nothing left to wear.
            var remaining = dropped < broken ? 0 : total % StoneWearPerMicrocell;
            if (remaining != (counters?[micro] ?? 0))
            {
                if (counters is null) wear[index] = counters = new byte[MicroCount];
                counters[micro] = (byte)remaining;
                wearChanged = true;
            }
        }
        if (current == start && !wearChanged) return 0;
        if (heights is null)
        {
            heights = new short[MicroCount];
            Array.Fill(heights, surface[index]);
            fine[index] = heights;
        }
        heights[micro] = (short)current;
        if (current != start)
        {
            if (!deferRefresh) RefreshColumn(index);
        }
        else
        {
            // Wear without a break still changes what the player should see (a crack), so presentation must pull it.
            Revision++;
            fineChangedAt[index] = Revision;
        }
        return start - current;
    }

    /// <summary>
    /// Collapse one microcolumn straight down to <paramref name="target"/> (never below the floor, bedrock at most). Unlike an impact it takes
    /// no wear: it is unsupported material falling away. Returns the microcells lost.
    /// </summary>
    public int LowerMicroTo(int column, int row, int microX, int microY, int target, int floor = BedrockMicrocells)
    {
        if (!Contains(column, row) || microX is < 0 or >= MicroPerColumn || microY is < 0 or >= MicroPerColumn) return 0;
        var index = row * Columns + column;
        if (topsoil[index] == ArenaTerrainMaterial.Lava || materials[index] == ArenaTerrainMaterial.Lava) return 0;
        target = Math.Max(target, Math.Max(floor, BedrockMicrocells));
        var current = MicroSurface(column, row, microX, microY);
        if (target >= current) return 0;
        if (!fine.TryGetValue(index, out var heights))
        {
            heights = new short[MicroCount];
            Array.Fill(heights, surface[index]);
            fine[index] = heights;
        }
        heights[microY * MicroPerColumn + microX] = (short)target;
        RefreshColumn(index);
        return current - target;
    }

    /// <summary>
    /// Generation only: replaces a column's 64 microcolumn heights so slopes and cliff edges are shaped finer than one metre. The column keeps
    /// its material and stone line; its coarse height becomes the mean of the new heights.
    /// </summary>
    public void ShapeFine(int column, int row, short[] heights)
    {
        if (!Contains(column, row)) throw new ArgumentOutOfRangeException(nameof(column));
        if (heights.Length != MicroCount) throw new ArgumentException("A subdivided column has exactly 64 microcolumns.", nameof(heights));
        var index = row * Columns + column;
        if (materials[index] == ArenaTerrainMaterial.Lava) return;
        var floor = (short)BedrockMicrocells;
        fine[index] = heights.Select(height => Math.Max(height, floor)).Select(height => (short)height).ToArray();
        RefreshColumn(index);
    }

    // The coarse height every gameplay query reads is the rounded mean of the 64 microcolumns, in exact integer arithmetic.
    private void RefreshColumn(int index)
    {
        var heights = fine[index];
        var sum = 0;
        foreach (var height in heights) sum += height;
        var mean = sum >= 0 ? (sum + MicroCount / 2) / MicroCount : -((-sum + MicroCount / 2) / MicroCount);
        surface[index] = (short)mean;
        if (topsoil[index] is ArenaTerrainMaterial.Soil or ArenaTerrainMaterial.Ash)
            materials[index] = mean <= stoneTop[index] ? ArenaTerrainMaterial.Stone : topsoil[index];
        Revision++;
        fineChangedAt[index] = Revision;
    }

    /// <summary>Restore a recorded column exactly; used by save and replay, never by gameplay.</summary>
    public void Restore(int column, int row, int surfaceMicrocells, ArenaTerrainMaterial material, short[]? fineHeights = null, byte[]? stoneWear = null)
    {
        if (stoneWear is not null && stoneWear.Length != MicroCount) throw new ArgumentException("Stone wear has exactly 64 counters.", nameof(stoneWear));
        var index = row * Columns + column;
        var kept = stoneTop[index];
        var keptTopsoil = topsoil[index];
        Set(column, row, surfaceMicrocells, material);
        stoneTop[index] = kept;
        topsoil[index] = keptTopsoil;
        if (stoneWear is not null) wear[index] = (byte[])stoneWear.Clone();
        if (fineHeights is null) return;
        if (fineHeights.Length != MicroCount) throw new ArgumentException("A subdivided column has exactly 64 microcolumns.", nameof(fineHeights));
        fine[index] = (short[])fineHeights.Clone();
        RefreshColumn(index);
        // The recorded coarse values are authoritative; the mean must agree with them.
        surface[index] = (short)surfaceMicrocells;
        materials[index] = material;
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
