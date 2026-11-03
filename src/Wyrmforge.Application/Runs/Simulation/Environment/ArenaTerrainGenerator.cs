namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>A generated arena heightfield and the cells it promises to keep walkable.</summary>
public sealed record ArenaTerrainRecipe(
    ArenaTerrainGrid Grid,
    (int Column, int Row) Spawn,
    (int Column, int Row) Exit,
    IReadOnlyList<(int Column, int Row)> ProtectedRoute)
{
    /// <summary>Row-major mask of the route, spawn and exit clearings; excavation there is depth-limited.</summary>
    public bool[] ProtectedCells { get; init; } = [];
}

/// <summary>
/// Deterministic arena terrain from the node's seed and Wyrm influence. A protected route from spawn to exit is flat
/// and carved last, so rock steps and fissures can never close it. Draws only from its own random stream.
/// </summary>
public static class ArenaTerrainGenerator
{
    public const int RouteHalfWidthCells = 2;
    public const int SpawnClearCells = 5;
    public const int ExitClearCells = 4;
    private const int Step = ArenaTerrainGrid.MaxStepMicrocells;

    public static ArenaTerrainRecipe Generate(int seed, double influence, int columns, int rows,
        (int Column, int Row) spawn, (int Column, int Row) exit)
    {
        influence = double.IsFinite(influence) ? Math.Clamp(influence, 0, 1) : 0;
        var rng = new Random(unchecked(seed * (int)0x9E3779B1 ^ 0x5EED7E44));
        var grid = new ArenaTerrainGrid(columns, rows);
        grid.SetVisualSeed(seed);
        var route = Rasterize(rng, columns, rows, spawn, exit);
        var protectedCells = new bool[columns * rows];
        foreach (var (rc, rr) in route)
            Mark(protectedCells, columns, rows, rc, rr, RouteHalfWidthCells);
        Mark(protectedCells, columns, rows, spawn.Column, spawn.Row, SpawnClearCells);
        Mark(protectedCells, columns, rows, exit.Column, exit.Row, ExitClearCells);

        PaintAshPatches(rng, grid, influence);
        PlaceRockSteps(rng, grid, protectedCells, influence);
        var routeDistance = ArenaTerrainRelief.DistanceFromRoute(protectedCells, columns, rows);
        ArenaTerrainRelief.Ridges(rng, grid, protectedCells, routeDistance, influence);
        ArenaTerrainRelief.Pillars(rng, grid, routeDistance);
        var heatSources = ArenaTerrainRelief.LavaPools(rng, grid, routeDistance, influence);
        CarveFissures(rng, grid, protectedCells, influence);
        ArenaTerrainRelief.Hills(rng, grid, routeDistance, influence);
        ArenaTerrainRelief.Weather(rng, grid, protectedCells);
        ArenaTerrainMutation.SettleAll(grid, protectedCells);
        // Generation-time blasts use negative ids so they can never collide with a live impact.
        long scarId = -1;
        heatSources.AddRange(ArenaTerrainRelief.ScarCraters(rng, grid, protectedCells, routeDistance, influence, ref scarId));
        grid.SetCracks(ArenaTerrainRelief.Cracks(rng, grid, protectedCells, routeDistance, heatSources, influence, ref scarId));

        // The protected route and its clearings are levelled last so nothing above can close them.
        for (var row = 0; row < rows; row++)
            for (var column = 0; column < columns; column++)
                if (protectedCells[row * columns + column])
                    grid.Set(column, row, 0, influence >= .25 && grid.Material(column, row) == ArenaTerrainMaterial.Ash
                        ? ArenaTerrainMaterial.Ash : ArenaTerrainMaterial.Soil);
        return new ArenaTerrainRecipe(grid, spawn, exit, route) { ProtectedCells = protectedCells };
    }

    private static List<(int Column, int Row)> Rasterize(Random rng, int columns, int rows,
        (int Column, int Row) spawn, (int Column, int Row) exit)
    {
        var bend = (rng.Next(2) * 2 - 1) * (3 + rng.Next(5));
        var midColumn = Math.Clamp((spawn.Column + exit.Column) / 2 + bend, RouteHalfWidthCells + 1, columns - RouteHalfWidthCells - 2);
        var mid = (Column: midColumn, Row: (spawn.Row + exit.Row) / 2);
        var points = new[] { spawn, mid, exit };
        var cells = new List<(int Column, int Row)>();
        for (var leg = 0; leg < points.Length - 1; leg++)
        {
            var (a, b) = (points[leg], points[leg + 1]);
            var steps = Math.Max(Math.Abs(b.Column - a.Column), Math.Abs(b.Row - a.Row));
            for (var step = 0; step <= steps; step++)
            {
                var t = steps == 0 ? 0 : step / (double)steps;
                var cell = ((int)Math.Round(a.Column + (b.Column - a.Column) * t), (int)Math.Round(a.Row + (b.Row - a.Row) * t));
                if (cells.Count == 0 || cells[^1] != cell) cells.Add(cell);
            }
        }
        return cells;
    }

    private static void Mark(bool[] mask, int columns, int rows, int centreColumn, int centreRow, int radius)
    {
        for (var row = Math.Max(0, centreRow - radius); row <= Math.Min(rows - 1, centreRow + radius); row++)
            for (var column = Math.Max(0, centreColumn - radius); column <= Math.Min(columns - 1, centreColumn + radius); column++)
                if ((column - centreColumn) * (column - centreColumn) + (row - centreRow) * (row - centreRow) <= radius * radius + 1)
                    mask[row * columns + column] = true;
    }

    private static void PaintAshPatches(Random rng, ArenaTerrainGrid grid, double influence)
    {
        // Gravel patches break up even a natural arena; the Wyrm's ash spreads them as the land burns.
        var patches = Math.Max(4, (int)Math.Round(influence * 14));
        for (var patch = 0; patch < patches; patch++)
        {
            var (cx, cy, radius) = (rng.Next(grid.Columns), rng.Next(grid.Rows), 2 + rng.Next(4));
            for (var row = Math.Max(0, cy - radius); row <= Math.Min(grid.Rows - 1, cy + radius); row++)
                for (var column = Math.Max(0, cx - radius); column <= Math.Min(grid.Columns - 1, cx + radius); column++)
                    if ((column - cx) * (column - cx) + (row - cy) * (row - cy) <= radius * radius)
                        grid.Set(column, row, 0, ArenaTerrainMaterial.Ash);
        }
    }

    // Rock steps of 1-3 m: lobed, irregular outcrops (never rectangles), sheer where they meet low ground, with one side an ascending ramp of half-metre steps.
    private static void PlaceRockSteps(Random rng, ArenaTerrainGrid grid, bool[] protectedCells, double influence)
    {
        var target = 4 + rng.Next(4) - (int)Math.Round(influence * 2);
        var heights = new[] { 8, 16, 24 };
        for (var attempt = 0; attempt < 80 && target > 0; attempt++)
        {
            var (rx, ry) = (1.8 + rng.NextDouble() * 2.6, 1.8 + rng.NextDouble() * 2.6);
            var centre = (X: 3 + rng.Next(Math.Max(1, grid.Columns - 6)), Y: 4 + rng.Next(Math.Max(1, grid.Rows - 8)));
            var phases = new[] { rng.NextDouble() * 6.28, rng.NextDouble() * 6.28, rng.NextDouble() * 6.28 };
            var height = heights[rng.Next(heights.Length)];
            var rampSide = rng.Next(4);
            var reach = (int)Math.Ceiling(Math.Max(rx, ry) * 1.5) + 1;
            var cells = new List<(int Column, int Row)>();
            var inside = new HashSet<(int, int)>();
            for (var row = centre.Y - reach; row <= centre.Y + reach; row++)
                for (var column = centre.X - reach; column <= centre.X + reach; column++)
                {
                    var (dx, dy) = (column - centre.X, row - centre.Y);
                    var angle = Math.Atan2(dy, dx);
                    var edge = Math.Sqrt(dx * dx / (rx * rx) + dy * dy / (ry * ry))
                        + .22 * Math.Sin(2 * angle + phases[0]) + .17 * Math.Sin(3 * angle + phases[1]) + .1 * Math.Sin(5 * angle + phases[2]);
                    if (edge >= 1) continue;
                    cells.Add((column, row));
                    inside.Add((column, row));
                }
            if (cells.Count < 5) continue;
            var rampLength = height / Step;
            var (rdx, rdy) = rampSide switch { 0 => (0, -1), 1 => (1, 0), 2 => (0, 1), _ => (-1, 0) };
            // Ramp cells: those outside the outcrop from which marching toward it reaches it within the ramp length, at most four wide.
            var ramp = new List<(int Column, int Row, int Steps)>();
            var (lateralX, lateralY) = (rdy, rdx);
            var middle = cells.OrderBy(cell => Math.Abs((cell.Column - centre.X) * lateralX + (cell.Row - centre.Y) * lateralY)).First();
            for (var lateral = -1; lateral <= 1; lateral++)
                for (var steps = 1; steps <= rampLength; steps++)
                {
                    // Walk outward from the outcrop's edge along the ramp direction.
                    var (c, r) = (middle.Column + lateralX * lateral, middle.Row + lateralY * lateral);
                    while (inside.Contains((c, r))) (c, r) = (c + rdx, r + rdy);
                    (c, r) = (c + rdx * (steps - 1), r + rdy * (steps - 1));
                    ramp.Add((c, r, steps));
                }
            var footprint = cells.Concat(ramp.Select(cell => (cell.Column, cell.Row))).ToList();
            var clear = true;
            foreach (var (column, row) in footprint)
                for (var dy = -1; dy <= 1 && clear; dy++)
                    for (var dx = -1; dx <= 1 && clear; dx++)
                    {
                        var (c, r) = (column + dx, row + dy);
                        if (inside.Contains((c, r))) continue;
                        if (!grid.Contains(c, r) || protectedCells[r * grid.Columns + c] || grid.Surface(c, r) != 0) clear = false;
                    }
            if (!clear) continue;
            foreach (var (column, row) in cells) grid.Set(column, row, height, ArenaTerrainMaterial.Stone);
            foreach (var (column, row, steps) in ramp)
            {
                var rampHeight = height - steps * Step;
                if (rampHeight > 0 && !inside.Contains((column, row))) grid.Set(column, row, rampHeight, ArenaTerrainMaterial.Stone);
            }
            target--;
        }
    }

    private static bool AllClear(ArenaTerrainGrid grid, bool[] protectedCells, int x, int y, int w, int h, bool requireFlat)
    {
        for (var row = y; row < y + h; row++)
            for (var column = x; column < x + w; column++)
            {
                if (!grid.Contains(column, row)) return false;
                if (protectedCells[row * grid.Columns + column]) return false;
                if (requireFlat && grid.Surface(column, row) != 0) return false;
            }
        return true;
    }

    // From Scorched onward the land splits: 2-3 cell wide fissures 2-4 m deep, lava-floored in the Wyrm's domain.
    private static void CarveFissures(Random rng, ArenaTerrainGrid grid, bool[] protectedCells, double influence)
    {
        if (influence < .55) return;
        var count = 1 + (int)Math.Floor((influence - .55) / .15);
        var width = influence >= .85 ? 3 : 2;
        var lava = influence >= .85;
        for (var fissure = 0; fissure < count; fissure++)
        {
            var row = 8 + rng.Next(Math.Max(1, grid.Rows - 16));
            var depth = -(16 + 8 * rng.Next(3));
            var column = rng.Next(2) == 0 ? 0 : grid.Columns - 1;
            var direction = column == 0 ? 1 : -1;
            var length = (int)(grid.Columns * (.6 + rng.NextDouble() * .4));
            for (var step = 0; step < length; step++)
            {
                for (var w = 0; w < width; w++)
                {
                    var r = row + w;
                    if (!grid.Contains(column, r) || protectedCells[r * grid.Columns + column]) continue;
                    grid.Set(column, r, depth, lava ? ArenaTerrainMaterial.Lava : ArenaTerrainMaterial.Stone);
                }
                column += direction;
                if (!grid.Contains(column, row)) break;
                if (rng.Next(3) == 0) row = Math.Clamp(row + rng.Next(3) - 1, 6, grid.Rows - 8);
            }
        }
    }
}
