namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Relief and landmarks that make an arena a place instead of a flat floor: rolling ground, rock ridges with passes, pillars and
/// boulder fields, basalt-rimmed lava pools, scars of old blasts and branching heat cracks that run from pool to pool and end in
/// a crater. Everything draws from the generator's own random stream, never touches the protected route, and is authoritative
/// state (heights, materials, the crack network) so presentation only reads it.
/// </summary>
internal static class ArenaTerrainRelief
{
    private const int Step = ArenaTerrainGrid.MaxStepMicrocells;
    private const int Micro = ArenaTerrainGrid.MicroPerColumn;

    /// <summary>Chebyshev distance in columns to the nearest protected cell, capped so far ground costs nothing to compute.</summary>
    public static int[] DistanceFromRoute(bool[] protectedCells, int columns, int rows, int cap = 12)
    {
        var distance = new int[columns * rows];
        Array.Fill(distance, cap);
        var queue = new Queue<int>();
        for (var index = 0; index < protectedCells.Length; index++)
            if (protectedCells[index]) { distance[index] = 0; queue.Enqueue(index); }
        while (queue.Count > 0)
        {
            var index = queue.Dequeue();
            var (column, row) = (index % columns, index / columns);
            for (var dy = -1; dy <= 1; dy++)
                for (var dx = -1; dx <= 1; dx++)
                {
                    var (c, r) = (column + dx, row + dy);
                    if (c < 0 || r < 0 || c >= columns || r >= rows) continue;
                    var next = r * columns + c;
                    if (distance[next] <= distance[index] + 1) continue;
                    distance[next] = distance[index] + 1;
                    queue.Enqueue(next);
                }
        }
        return distance;
    }

    private static bool Open(ArenaTerrainGrid grid, int column, int row) =>
        grid.Contains(column, row) && grid.Surface(column, row) == 0 && grid.Material(column, row) is ArenaTerrainMaterial.Soil or ArenaTerrainMaterial.Ash;

    // Smooth value noise in [-1, 1] over a coarse lattice, so hills are broad and neighbouring columns differ by at most a step or two.
    private static double Noise(int seed, double x, double y)
    {
        double Lattice(int ix, int iy)
        {
            var h = unchecked((uint)(ix * 73856093 ^ iy * 19349663 ^ seed * 83492791));
            h = unchecked((h ^ (h >> 13)) * 0x5BD1E995u);
            return (h ^ (h >> 15)) / (double)uint.MaxValue * 2 - 1;
        }
        var (x0, y0) = ((int)Math.Floor(x), (int)Math.Floor(y));
        var (fx, fy) = (x - x0, y - y0);
        (fx, fy) = (fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy));
        var top = Lattice(x0, y0) * (1 - fx) + Lattice(x0 + 1, y0) * fx;
        var bottom = Lattice(x0, y0 + 1) * (1 - fx) + Lattice(x0 + 1, y0 + 1) * fx;
        return top * (1 - fy) + bottom * fy;
    }

    /// <summary>Broad walkable rises and, from the Scorched band, shallow dells: voxel terraces of at most a couple of microcells per column.</summary>
    public static void Hills(Random rng, ArenaTerrainGrid grid, int[] routeDistance, double influence)
    {
        var seed = rng.Next();
        var amplitude = 9.0;
        var dells = influence >= .25;
        for (var row = 0; row < grid.Rows; row++)
            for (var column = 0; column < grid.Columns; column++)
            {
                if (!Open(grid, column, row)) continue;
                var near = routeDistance[row * grid.Columns + column];
                if (near < 2) continue;
                var fade = Math.Min(1.0, (near - 1) / 3.0);
                var n = Noise(seed, column / 8.0, row / 8.0) * .8 + Noise(seed + 17, column / 3.0, row / 3.0) * .2;
                var height = (int)Math.Round(n * amplitude * fade);
                if (!dells) height = Math.Max(0, height);
                else height = Math.Max(-5, height);
                if (height != 0) grid.Set(column, row, height, grid.Material(column, row));
            }
    }

    /// <summary>
    /// Makes the land look grown rather than built. Gentle ground is blended between column centres so slopes roll in 12.5 cm voxel steps.
    /// Every cliff of 1.1 m or more meanders in plan (the edge recedes 0 to 62 cm along its length), steps down in ledges where it is tall,
    /// and drops rubble at its foot; smaller rises are chipped raggedly. Features are driven by smoothed noise indexed in global microcells,
    /// so a cliff continues unbroken from one column to the next, and a median filter removes one-cell fins. Never touches the route.
    /// </summary>
    public static void Weather(Random rng, ArenaTerrainGrid grid, bool[] protectedCells)
    {
        var seed = rng.Next();
        var (columns, rows) = (grid.Columns, grid.Rows);
        var whole = new int[columns * rows];
        for (var index = 0; index < whole.Length; index++) whole[index] = grid.Surface(index % columns, index / columns);
        bool Soft(int column, int row) => grid.Contains(column, row) && grid.Material(column, row) is ArenaTerrainMaterial.Soil or ArenaTerrainMaterial.Ash;
        double Unit(int x, int y)
        {
            var h = unchecked((uint)(x * 73856093 ^ y * 19349663 ^ seed * 83492791));
            h = unchecked((h ^ (h >> 13)) * 0x5BD1E995u);
            return (h ^ (h >> 15)) / (double)uint.MaxValue;
        }
        // Meander depth 0..5 microcells at a global position along an edge; the median of three keeps it free of one-cell spikes.
        int Meander(int side, int along, int salt)
        {
            double Raw(int a) => Noise(seed + side * 31 + salt, a / 5.0, side * 7.0 + salt);
            var values = new[] { Raw(along - 1), Raw(along), Raw(along + 1) };
            Array.Sort(values);
            return (int)Math.Round((values[1] + 1) / 2 * 5);
        }
        (int Mx, int My) Cell(int side, int along, int depth) => side switch
        {
            0 => (depth, along), 1 => (Micro - 1 - depth, along), 2 => (along, depth), _ => (along, Micro - 1 - depth),
        };
        var offsets = new[] { (-1, 0), (1, 0), (0, -1), (0, 1) };
        for (var row = 0; row < rows; row++)
            for (var column = 0; column < columns; column++)
            {
                var index = row * columns + column;
                var material = grid.Material(column, row);
                if (protectedCells[index] || material is ArenaTerrainMaterial.Lava or ArenaTerrainMaterial.Wood or ArenaTerrainMaterial.Boulder) continue;
                var own = whole[index];
                var soft = Soft(column, row);
                var heights = new short[ArenaTerrainGrid.MicroCount];
                Array.Fill(heights, (short)own);
                var changed = false;
                void Lower(int mx, int my, int target)
                {
                    var i = my * Micro + mx;
                    if (target >= heights[i]) return;
                    heights[i] = (short)target; changed = true;
                }
                if (soft)
                {
                    // A neighbour joins the blend only when it is walkable ground within a step; a ledge stays sharp.
                    int Near(int c, int r) => Soft(c, r) && Math.Abs(whole[r * columns + c] - own) <= Step ? whole[r * columns + c] : own;
                    for (var my = 0; my < Micro; my++)
                        for (var mx = 0; mx < Micro; mx++)
                        {
                            var (u, v) = ((mx + .5 - Micro / 2.0) / Micro, (my + .5 - Micro / 2.0) / Micro);
                            var (sx, sy) = (u < 0 ? -1 : 1, v < 0 ? -1 : 1);
                            var (au, av) = (Math.Abs(u), Math.Abs(v));
                            var value = (1 - au) * (1 - av) * own + au * (1 - av) * Near(column + sx, row)
                                + (1 - au) * av * Near(column, row + sy) + au * av * Near(column + sx, row + sy);
                            heights[my * Micro + mx] = (short)Math.Round(value);
                        }
                    // A slope that never leaves a 25 cm band is not worth 64 voxels: the column stays whole.
                    changed = heights.Max() - heights.Min() > 2;
                    if (!changed) Array.Fill(heights, (short)own);
                }
                for (var side = 0; side < 4; side++)
                {
                    var (nc, nr) = (column + offsets[side].Item1, row + offsets[side].Item2);
                    if (!grid.Contains(nc, nr)) continue;
                    var neighbour = whole[nr * columns + nc];
                    var drop = own - neighbour;
                    for (var along = 0; along < Micro; along++)
                    {
                        var global = side < 2 ? row * Micro + along : column * Micro + along;
                        if (drop >= 9)
                        {
                            var edge = Meander(side, global, 0);
                            var recede = Math.Max(0, edge - 1 - (Meander(side, global, 5) >= 2 ? 1 : 0));
                            var ledge = own - Math.Max(Step, drop / 2 / Step * Step);
                            for (var depth = 0; depth < edge; depth++)
                            {
                                var (mx, my) = Cell(side, along, depth);
                                Lower(mx, my, drop >= 12 && depth >= recede ? Math.Max(ledge, neighbour) : neighbour);
                            }
                        }
                        else if (drop >= 3 && !soft)
                        {
                            for (var depth = 0; depth < 3; depth++)
                            {
                                var (mx, my) = Cell(side, along, depth);
                                var chipped = (int)Math.Floor(Unit(column * Micro + mx, row * Micro + my) * (3 - depth));
                                Lower(mx, my, own - Math.Min(chipped, drop - 1));
                            }
                        }
                        else if (-drop >= 9)
                        {
                            // Rubble at the foot of a cliff: a one or two microcell apron that thins out from the wall.
                            for (var depth = 0; depth < 2; depth++)
                            {
                                if (Unit(global * 7 + depth, side + 11 * (column + row)) < .35) continue;
                                var (mx, my) = Cell(side, along, depth);
                                var i = my * Micro + mx;
                                var raised = (short)(own + 2 - depth);
                                if (raised > heights[i]) { heights[i] = raised; changed = true; }
                            }
                        }
                    }
                }
                if (changed) grid.ShapeFine(column, row, heights);
            }
    }

    /// <summary>
    /// Long stone ridges, 1.5 to 2 m high and two columns wide, wandering across the arena with two or three passes each.
    /// They break wherever they meet the route and taper at both ends, so they shape the fight without caging it.
    /// </summary>
    public static void Ridges(Random rng, ArenaTerrainGrid grid, bool[] protectedCells, int[] routeDistance, double influence)
    {
        var count = 2 + rng.Next(2) + (influence >= .55 ? 1 : 0);
        for (var ridge = 0; ridge < count; ridge++)
        {
            // Start near an arena edge and wander inward so ridges frame the fight instead of piling up in the middle.
            var fromWest = rng.Next(2) == 0;
            var (x, y) = (fromWest ? 1.5 : grid.Columns - 2.5, 6 + rng.NextDouble() * (grid.Rows - 12));
            var heading = (fromWest ? 0 : Math.PI) + (rng.NextDouble() - .5) * 1.4;
            var length = 24 + rng.Next(18);
            var passes = new List<int> { 5 + rng.Next(6), length / 2 + rng.Next(5) };
            if (length > 34) passes.Add(length - 7);
            var cells = new List<(int Column, int Row, double Heading)>();
            for (var step = 0; step < length; step++)
            {
                cells.Add(((int)Math.Floor(x), (int)Math.Floor(y), heading));
                heading += (rng.NextDouble() - .5) * .5;
                (x, y) = (x + Math.Cos(heading), y + Math.Sin(heading));
                if (x < 1 || y < 2 || x >= grid.Columns - 1 || y >= grid.Rows - 2) break;
            }
            for (var i = 0; i < cells.Count; i++)
            {
                if (passes.Any(pass => Math.Abs(pass - i) <= 1)) continue;
                var taper = Math.Min(i, cells.Count - 1 - i) < 2 ? 1 : 0;
                // Broken crest: the top steps between 1.5 and 2 m along its length.
                var height = (Noise(ridge * 31 + 5, i / 3.0, 0) > .35 ? 12 : 16) - taper * Step;
                // Two columns wide, across the direction of travel.
                var (nx, ny) = (Math.Round(-Math.Sin(cells[i].Heading)), Math.Round(Math.Cos(cells[i].Heading)));
                foreach (var (dx, dy) in new[] { (0, 0), ((int)nx, (int)ny) })
                {
                    var (c, r) = (cells[i].Column + dx, cells[i].Row + dy);
                    if (!grid.Contains(c, r) || protectedCells[r * grid.Columns + c] || routeDistance[r * grid.Columns + c] < 2) continue;
                    if (!Open(grid, c, r)) continue;
                    grid.Set(c, r, height, ArenaTerrainMaterial.Stone);
                }
            }
        }
    }
    /// <summary>
    /// Trees: single-block trunks (1.5 to 3.5 m, shorter and charred toward the Wyrm) in loose groves on open ground, never within three columns
    /// of the route or beside lava. A trunk is ordinary terrain (material Wood): it blocks walking and shots, and fire wears it away like
    /// rock, so the same C# rules decide when a tree falls. The canopy is presentation only.
    /// </summary>
    public static void Trees(Random rng, ArenaTerrainGrid grid, int[] routeDistance, double influence)
    {
        var target = influence < .25 ? 22 + rng.Next(8) : influence < .55 ? 16 + rng.Next(6) : influence < .85 ? 10 + rng.Next(5) : 6 + rng.Next(4);
        var placed = new List<(int Column, int Row)>();
        bool Clear(int column, int row)
        {
            if (!Open(grid, column, row) || routeDistance[row * grid.Columns + column] < 3) return false;
            for (var dy = -2; dy <= 2; dy++)
                for (var dx = -2; dx <= 2; dx++)
                    if (grid.Contains(column + dx, row + dy) && grid.Material(column + dx, row + dy) is ArenaTerrainMaterial.Lava or ArenaTerrainMaterial.Wood && Math.Abs(dx) + Math.Abs(dy) <= 1) return false;
            return true;
        }
        for (var attempt = 0; attempt < target * 14 && placed.Count < target; attempt++)
        {
            // Most trees stand near an earlier one, so they gather in groves instead of a regular scatter.
            var (column, row) = placed.Count > 0 && rng.Next(10) < 7
                ? (placed[rng.Next(placed.Count)].Column + rng.Next(7) - 3, placed[rng.Next(placed.Count)].Row + rng.Next(7) - 3)
                : (2 + rng.Next(grid.Columns - 4), 4 + rng.Next(grid.Rows - 8));
            if (!grid.Contains(column, row) || !Clear(column, row)) continue;
            grid.Set(column, row, (influence >= .85 ? 8 : 16) + Step * rng.Next(4), ArenaTerrainMaterial.Wood);
            placed.Add((column, row));
        }
        // A forest wall frames the arena's two long edges: trunks in the outer two columns, thinning toward the Wyrm. They stay clear of
        // the route and of lava, and the tree line leaves gaps so the edge reads as woodland rather than a fence.
        var wall = .7 - influence * .55;
        for (var row = 2; row < grid.Rows - 2; row += 2)
            foreach (var side in new[] { 0, grid.Columns - 2 })
            {
                var (column, y) = (side + rng.Next(2), row + rng.Next(2));
                if (rng.NextDouble() >= wall || !grid.Contains(column, y) || !Open(grid, column, y) || routeDistance[y * grid.Columns + column] < 3) continue;
                grid.Set(column, y, (influence >= .85 ? 8 : 16) + Step * rng.Next(4), ArenaTerrainMaterial.Wood);
            }
    }

    /// <summary>
    /// Boulders: lone pillars (cover that blocks shots) with smaller rocks leaning on them, and low boulder fields (rubble to fight across).
    /// A boulder is stone for every gameplay rule and breaks like it; the client draws it as an upright rock that shrinks as it is worn down.
    /// </summary>
    public static void Pillars(Random rng, ArenaTerrainGrid grid, int[] routeDistance)
    {
        var pillars = 9 + rng.Next(7);
        for (var placed = 0; placed < pillars; placed++)
        {
            var (column, row) = (1 + rng.Next(grid.Columns - 2), 3 + rng.Next(grid.Rows - 6));
            if (!Open(grid, column, row) || routeDistance[row * grid.Columns + column] < 3) continue;
            var top = new[] { 12, 16, 20 }[rng.Next(3)];
            grid.Set(column, row, top, ArenaTerrainMaterial.Boulder);
            // An outcrop, not a post: lower stones lean against it, stepping down so each rises at most a step above the next.
            for (var satellite = 0; satellite < rng.Next(4); satellite++)
            {
                var (sc, sr) = (column + rng.Next(3) - 1, row + rng.Next(3) - 1);
                if ((sc == column && sr == row) || !Open(grid, sc, sr) || routeDistance[sr * grid.Columns + sc] < 3) continue;
                grid.Set(sc, sr, Math.Max(Step, top - Step * (1 + rng.Next(3))), ArenaTerrainMaterial.Boulder);
            }
        }
        var fields = 3 + rng.Next(3);
        for (var field = 0; field < fields; field++)
        {
            var (cx, cy) = (2 + rng.Next(grid.Columns - 4), 4 + rng.Next(grid.Rows - 8));
            for (var stone = 0; stone < 4 + rng.Next(4); stone++)
            {
                var (column, row) = (cx + rng.Next(5) - 2, cy + rng.Next(5) - 2);
                if (!Open(grid, column, row) || routeDistance[row * grid.Columns + column] < 3) continue;
                grid.Set(column, row, 4 * (1 + rng.Next(2)), ArenaTerrainMaterial.Boulder);
            }
        }
    }

    /// <summary>
    /// Lava pools with a raised basalt lip, from the Burning band onward: lobed, uneven outlines with inlets and bays, one or two satellite
    /// puddles and the odd islet of rock, never an ellipse. Returns their centres in microcells.
    /// </summary>
    public static List<(int X, int Y)> LavaPools(Random rng, ArenaTerrainGrid grid, int[] routeDistance, double influence)
    {
        var centres = new List<(int X, int Y)>();
        if (influence < .55) return centres;
        var count = 1 + (int)Math.Floor((influence - .55) / .15);
        bool Stamp(int cx, int cy, double rx, double ry, double[] phases, double lobes)
        {
            var any = false;
            var reach = (int)Math.Ceiling(Math.Max(rx, ry) * 1.6) + 2;
            for (var row = cy - reach; row <= cy + reach; row++)
                for (var column = cx - reach; column <= cx + reach; column++)
                {
                    if (!grid.Contains(column, row)) continue;
                    var (dx, dy) = (column - cx, row - cy);
                    var angle = Math.Atan2(dy, dx);
                    var edge = Math.Sqrt(dx * dx / (rx * rx) + dy * dy / (ry * ry))
                        + lobes * (.2 * Math.Sin(2 * angle + phases[2]) + .16 * Math.Sin(3 * angle + phases[0]) + .1 * Math.Sin(5 * angle + phases[1]) + .07 * Math.Sin(7 * angle + phases[3]));
                    if (edge < 1)
                    {
                        if (grid.Material(column, row) == ArenaTerrainMaterial.Stone && grid.Surface(column, row) > Step && routeDistance[row * grid.Columns + column] < 2) continue;
                        grid.Set(column, row, -8, ArenaTerrainMaterial.Lava);
                        any = true;
                    }
                    else if (edge < 1.4 && Open(grid, column, row) && routeDistance[row * grid.Columns + column] >= 2)
                        grid.Set(column, row, Step, ArenaTerrainMaterial.Stone);
                }
            return any;
        }
        double[] Phases() => [rng.NextDouble() * 6.28, rng.NextDouble() * 6.28, rng.NextDouble() * 6.28, rng.NextDouble() * 6.28];
        for (var pool = 0; pool < count; pool++)
        {
            var (rx, ry) = (2.2 + rng.NextDouble() * 2.2, 2.2 + rng.NextDouble() * 2.2);
            var phases = Phases();
            for (var attempt = 0; attempt < 40; attempt++)
            {
                var (cx, cy) = (3 + rng.Next(grid.Columns - 6), 5 + rng.Next(grid.Rows - 10));
                if (routeDistance[cy * grid.Columns + cx] < Math.Max(rx, ry) * 1.3 + 3) continue;
                if (!Stamp(cx, cy, rx, ry, phases, 1.0)) break;
                // Satellite puddles bud off the shore, then an islet of rock stands in the main pool.
                for (var puddle = 0; puddle < 1 + rng.Next(2); puddle++)
                {
                    var bearing = rng.NextDouble() * 6.28;
                    var reach = Math.Max(rx, ry) * (1.15 + rng.NextDouble() * .5) + 1;
                    var (px, py) = (cx + (int)Math.Round(Math.Cos(bearing) * reach), cy + (int)Math.Round(Math.Sin(bearing) * reach));
                    if (!grid.Contains(px, py) || routeDistance[py * grid.Columns + px] < 4) continue;
                    Stamp(px, py, 1.0 + rng.NextDouble() * .8, 1.0 + rng.NextDouble() * .8, Phases(), .8);
                }
                if (rx > 3 && ry > 3)
                {
                    var (ix, iy) = (cx + rng.Next(3) - 1, cy + rng.Next(3) - 1);
                    if (grid.Material(ix, iy) == ArenaTerrainMaterial.Lava) grid.Set(ix, iy, 3 * Step, ArenaTerrainMaterial.Stone);
                }
                centres.Add((cx * Micro + Micro / 2, cy * Micro + Micro / 2));
                break;
            }
        }
        return centres;
    }

    /// <summary>Scars of old blasts: real round voxel craters dug with the same rule a Fireball uses, so they have strata and can be dug deeper.</summary>
    public static List<(int X, int Y)> ScarCraters(Random rng, ArenaTerrainGrid grid, bool[] protectedCells, int[] routeDistance, double influence, ref long impactId)
    {
        var centres = new List<(int X, int Y)>();
        if (influence < .25) return centres;
        var count = 2 + (int)Math.Floor(influence * 6);
        for (var scar = 0; scar < count; scar++)
        {
            var (column, row) = (2 + rng.Next(grid.Columns - 4), 4 + rng.Next(grid.Rows - 8));
            if (routeDistance[row * grid.Columns + column] < 4 || grid.Material(column, row) == ArenaTerrainMaterial.Lava) continue;
            Blast(grid, protectedCells, (column + .5) * ArenaTerrainGrid.CellUnits, (row + .5) * ArenaTerrainGrid.CellUnits, 3, ref impactId);
            Blast(grid, protectedCells, (column + .5) * ArenaTerrainGrid.CellUnits, (row + .5) * ArenaTerrainGrid.CellUnits, 2, ref impactId);
            centres.Add((column * Micro + Micro / 2, row * Micro + Micro / 2));
        }
        return centres;
    }

    private static void Blast(ArenaTerrainGrid grid, bool[] protectedCells, double x, double y, int power, ref long impactId) =>
        ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(impactId--, new Wyrmforge.Domain.Combat.Geometry.Vector2D(x, y), power), protectedCells);

    /// <summary>
    /// The heat-crack network, in global microcell coordinates, as paths of 4-adjacent cells. Each crack runs from a pool or crater
    /// toward another one, sometimes forking; a fork either reaches another source or dies out in a freshly blasted crater.
    /// Few cracks, but long ones. Cracks never enter the protected route.
    /// </summary>
    public static List<int[]> Cracks(Random rng, ArenaTerrainGrid grid, bool[] protectedCells, int[] routeDistance, IReadOnlyList<(int X, int Y)> sources,
        double influence, ref long impactId)
    {
        var cracks = new List<int[]>();
        if (influence < .25) return cracks;
        var width = grid.Columns * Micro;
        var height = grid.Rows * Micro;
        var all = sources.ToList();
        for (var vent = 0; vent < 2; vent++) all.Add((Micro + rng.Next(width - 2 * Micro), 3 * Micro + rng.Next(height - 6 * Micro)));
        var count = 1 + (int)Math.Floor(influence * 2.5);
        bool Free(int x, int y) => x >= 0 && y >= 0 && x < width && y < height && !protectedCells[y / Micro * grid.Columns + x / Micro] && routeDistance[y / Micro * grid.Columns + x / Micro] >= 1;

        List<(int X, int Y)> Walk((int X, int Y) from, (int X, int Y) to, int maxSteps)
        {
            var path = new List<(int X, int Y)> { from };
            var (x, y) = from;
            var horizontal = rng.Next(2) == 0;
            var run = 0;
            for (var step = 0; step < maxSteps; step++)
            {
                var (dx, dy) = (to.X - x, to.Y - y);
                if (Math.Abs(dx) + Math.Abs(dy) <= 2) break;
                if (run <= 0)
                {
                    horizontal = Math.Abs(dx) * (.7 + rng.NextDouble() * .6) > Math.Abs(dy) * (.7 + rng.NextDouble() * .6);
                    run = 2 + rng.Next(4);
                }
                run--;
                var (sx, sy) = horizontal ? (Math.Sign(dx), 0) : (0, Math.Sign(dy));
                // A sideways wobble makes the crack meander like a fracture instead of a diagonal staircase.
                if (rng.NextDouble() < .2) (sx, sy) = horizontal ? (0, rng.Next(2) * 2 - 1) : (rng.Next(2) * 2 - 1, 0);
                if (sx == 0 && sy == 0) { horizontal = !horizontal; continue; }
                var (nx, ny) = (x + sx, y + sy);
                if (!Free(nx, ny)) break;
                (x, y) = (nx, ny);
                path.Add((x, y));
            }
            return path;
        }

        int[] Flatten(List<(int X, int Y)> path)
        {
            var flat = new int[path.Count * 2];
            for (var i = 0; i < path.Count; i++) (flat[i * 2], flat[i * 2 + 1]) = path[i];
            return flat;
        }

        for (var crack = 0; crack < count && all.Count > 1; crack++)
        {
            List<(int X, int Y)>? main = null;
            for (var attempt = 0; attempt < 6 && main is null; attempt++)
            {
                var from = rng.Next(all.Count);
                var to = (from + 1 + rng.Next(all.Count - 1)) % all.Count;
                var candidate = Walk(all[from], all[to], 220);
                if (candidate.Count >= 24) main = candidate;
            }
            if (main is null) continue;
            cracks.Add(Flatten(main));
            // Forks leave the main crack every dozen cells or so and either join another source or end in a crater.
            for (var at = 10 + rng.Next(8); at < main.Count - 8; at += 16 + rng.Next(14))
            {
                if (rng.NextDouble() > .45) continue;
                var joins = rng.Next(2) == 0;
                var target = joins ? all[rng.Next(all.Count)]
                    : (X: main[at].X + rng.Next(41) - 20, Y: main[at].Y + rng.Next(41) - 20);
                var fork = Walk(main[at], target, joins ? 120 : 24 + rng.Next(20));
                if (fork.Count < 8) continue;
                cracks.Add(Flatten(fork));
                if (!joins && Free(fork[^1].X, fork[^1].Y) && routeDistance[fork[^1].Y / Micro * grid.Columns + fork[^1].X / Micro] >= 3)
                    Blast(grid, protectedCells, (fork[^1].X + .5) * ArenaTerrainGrid.MicroUnits, (fork[^1].Y + .5) * ArenaTerrainGrid.MicroUnits, rng.Next(2) + 1, ref impactId);
            }
        }
        return cracks;
    }
}
