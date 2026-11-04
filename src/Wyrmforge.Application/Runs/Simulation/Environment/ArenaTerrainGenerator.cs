namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>A generated arena heightfield and the cells it promises to keep walkable.</summary>
public sealed record ArenaTerrainRecipe(
    ArenaTerrainGrid Grid,
    (int Column, int Row) Spawn,
    (int Column, int Row) Exit,
    IReadOnlyList<(int Column, int Row)> ProtectedRoute)
{
    /// <summary>Row-major mask of the organic open floors (combat clearings, or a boss floor): kept free of rock, trees and lava, but fully destructible.</summary>
    public bool[] OpenCells { get; init; } = [];

    /// <summary>Row-major mask of the route, spawn and exit clearings; excavation there is depth-limited.</summary>
    public bool[] ProtectedCells { get; init; } = [];

    /// <summary>The open fields along the road (centre cell and mean radius in cells): flat, rock-free ground reserved for ambushes and set pieces.</summary>
    public IReadOnlyList<ArenaField> Fields { get; init; } = [];

    /// <summary>Row-major land use per cell (<see cref="ArenaZone"/>): which cells are woodland, highland or meadow.</summary>
    public byte[] Zones { get; init; } = [];
}

/// <summary>An open field beside or on the road.</summary>
public sealed record ArenaField(int Column, int Row, double Radius);

/// <summary>What a stretch of land is for; every tree, cliff, boulder and hill is placed by the zone it stands in.</summary>
public static class ArenaZone
{
    public const byte Wild = 0;
    public const byte Forest = 1;
    public const byte Highland = 2;
    public const byte Meadow = 3;
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

    /// <param name="bossFloorMeters">When above zero the arena is a boss arena: one organic, never-round open floor of about this diameter at its centre instead of the road clearings.</param>
    public static ArenaTerrainRecipe Generate(int seed, double influence, int columns, int rows,
        (int Column, int Row) spawn, (int Column, int Row) exit, double bossFloorMeters = 0)
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

        // Open fields keep rock, trees and lava away, but stay destructible, so they are not part of the protected route.
        var (open, fields) = ArenaTerrainRelief.Clearings(rng, columns, rows, route, bossFloorMeters);
        var keepClear = new bool[protectedCells.Length];
        for (var index = 0; index < keepClear.Length; index++) keepClear[index] = protectedCells[index] || open[index];

        PaintAshPatches(rng, grid, influence);
        var routeDistance = ArenaTerrainRelief.DistanceFromRoute(keepClear, columns, rows);
        // Land use first: every tree, cliff, boulder and hill below is placed by the zone it stands in, so the map reads as woodland, highland and meadow.
        var zones = ArenaTerrainRelief.Zones(rng, columns, rows, routeDistance, influence, fields);
        ArenaTerrainRelief.Highlands(rng, grid, zones, routeDistance);
        ArenaTerrainRelief.Boulders(rng, grid, zones, routeDistance);
        var heatSources = ArenaTerrainRelief.LavaPools(rng, grid, routeDistance, zones, influence);
        CarveFissures(rng, grid, keepClear, zones, influence);
        ArenaTerrainRelief.Forests(rng, grid, zones, routeDistance, influence);
        ArenaTerrainRelief.Hills(rng, grid, zones, routeDistance, influence);
        ArenaTerrainRelief.Weather(rng, grid, protectedCells);
        ArenaTerrainMutation.SettleAll(grid, protectedCells);
        // Generation-time blasts use negative ids so they can never collide with a live impact.
        long scarId = -1;
        var roadDistance = ArenaTerrainRelief.DistanceFromRoute(protectedCells, columns, rows);
        heatSources.AddRange(ArenaTerrainRelief.ScarCraters(rng, grid, protectedCells, open, roadDistance, influence, ref scarId));
        grid.SetCracks(ArenaTerrainRelief.Cracks(rng, grid, protectedCells, roadDistance, heatSources, influence, ref scarId));

        // The protected route and its clearings are levelled last so nothing above can close them.
        for (var row = 0; row < rows; row++)
            for (var column = 0; column < columns; column++)
                if (protectedCells[row * columns + column])
                    grid.Set(column, row, 0, influence >= .25 && grid.Material(column, row) == ArenaTerrainMaterial.Ash
                        ? ArenaTerrainMaterial.Ash : ArenaTerrainMaterial.Soil);
        return new ArenaTerrainRecipe(grid, spawn, exit, route) { ProtectedCells = protectedCells, OpenCells = open, Fields = fields, Zones = zones };
    }

    /// <summary>
    /// The road: a smooth S-curve from the spawn at the south end to the exit at the north end (the arena is portrait; the authored horizontal
    /// maps were turned to run bottom to top). Three bends alternate sides, 4 to 9 cells off the centre line, joined by a Catmull-Rom spline.
    /// </summary>
    private static List<(int Column, int Row)> Rasterize(Random rng, int columns, int rows,
        (int Column, int Row) spawn, (int Column, int Row) exit)
    {
        var sign = rng.Next(2) * 2 - 1;
        var low = Math.Min(RouteHalfWidthCells + 4, columns / 2);
        var high = Math.Max(low, columns - RouteHalfWidthCells - 5);
        var anchors = new List<(double X, double Y)> { (spawn.Column, spawn.Row) };
        var centre = (spawn.Column + exit.Column) / 2.0;
        for (var bend = 1; bend <= 3; bend++)
        {
            var y = spawn.Row + (exit.Row - spawn.Row) * bend / 4.0;
            anchors.Add((Math.Clamp(centre + sign * (4 + rng.Next(6)), low, high), y));
            sign = -sign;
        }
        anchors.Add((exit.Column, exit.Row));
        (double X, double Y) At(int index) => anchors[Math.Clamp(index, 0, anchors.Count - 1)];
        var cells = new List<(int Column, int Row)>();
        const int samplesPerSegment = 160;
        for (var segment = 0; segment < anchors.Count - 1; segment++)
            for (var sample = 0; sample <= samplesPerSegment; sample++)
            {
                var t = sample / (double)samplesPerSegment;
                double Spline(double p0, double p1, double p2, double p3) => .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
                var (a, b, c, d) = (At(segment - 1), At(segment), At(segment + 1), At(segment + 2));
                var cell = ((int)Math.Round(Math.Clamp(Spline(a.X, b.X, c.X, d.X), 0, columns - 1)), (int)Math.Round(Math.Clamp(Spline(a.Y, b.Y, c.Y, d.Y), 0, rows - 1)));
                if (cells.Count == 0 || cells[^1] != cell) cells.Add(cell);
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

    // From Scorched onward the land splits: 2-3 cell wide fissures 2-4 m deep, lava-floored in the Wyrm's domain.
    private static void CarveFissures(Random rng, ArenaTerrainGrid grid, bool[] protectedCells, byte[] zones, double influence)
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
            // Fissures open in the open land: look for an edge where the first cells are not woodland.
            for (var attempt = 0; attempt < 24; attempt++)
            {
                var direction0 = column == 0 ? 1 : -1;
                if (Enumerable.Range(0, 8).Count(s => zones[row * grid.Columns + Math.Clamp(column + direction0 * s, 0, grid.Columns - 1)] != ArenaZone.Forest) >= 6) break;
                row = 8 + rng.Next(Math.Max(1, grid.Rows - 16));
                column = rng.Next(2) == 0 ? 0 : grid.Columns - 1;
            }
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
