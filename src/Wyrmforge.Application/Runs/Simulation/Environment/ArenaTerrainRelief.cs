using Wyrmforge.Application.Runs.Navigation;

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

    /// <summary>
    /// Organic open fields on the road: two or three clearings (about 10 to 13 m across) that the road runs through, or, for a boss arena, a single
    /// floor of the given diameter at the arena centre. Never round: the outline swings between the lobes of a few sine terms and the blob is
    /// stretched along one axis. The fields are flat, rock-free and reserved for ambushes and other set pieces.
    /// </summary>
    public static (bool[] Mask, List<ArenaField> Fields) Clearings(Random rng, int columns, int rows, IReadOnlyList<(int Column, int Row)> route, double bossFloorMeters = 0)
    {
        var mask = new bool[columns * rows];
        var fields = new List<ArenaField>();
        if (bossFloorMeters > 0)
        {
            Blob(mask, columns, rows, (columns / 2, rows / 2), bossFloorMeters / 2, rng);
            fields.Add(new ArenaField(columns / 2, rows / 2, bossFloorMeters / 2));
            return (mask, fields);
        }
        if (route.Count < 24) return (mask, fields);
        foreach (var fraction in rng.Next(3) == 0 ? new[] { .24, .5, .76 } : new[] { .34, .68 })
        {
            var anchor = route[(int)(route.Count * fraction)];
            var radius = 5.0 + rng.NextDouble() * 1.5;
            var centre = (anchor.Column + (rng.Next(2) * 2 - 1) * (1 + rng.Next(3)), anchor.Row);
            Blob(mask, columns, rows, centre, radius, rng);
            fields.Add(new ArenaField(centre.Item1, centre.Item2, radius));
        }
        return (mask, fields);
    }

    /// <summary>
    /// Land use. Seven regions grow from seeds spread across the ground away from the road (one wooded seed is drawn to the first field, so the
    /// road opens into a clearing in the trees); each region is woodland, highland (cliffs) or meadow (hills), and their borders are warped by
    /// noise so they wander. Every later feature is placed by the zone it stands in, never scattered over the whole arena.
    /// </summary>
    public static byte[] Zones(Random rng, int columns, int rows, int[] routeDistance, double influence, IReadOnlyList<ArenaField> fields,
        WorldSiteLandform? landform = null, WyrmrealmHabitat? habitat = null)
    {
        var zone = new byte[columns * rows];
        Array.Fill(zone, ArenaZone.Meadow);
        var candidates = new List<int>();
        for (var index = 0; index < zone.Length; index++)
            if (routeDistance[index] >= 5) candidates.Add(index);
        if (candidates.Count < 8) return zone;
        // Chart landform first, encounter habitat second. The wet forest, exposed field and mountain must not share the same land-use template.
        var biomes = landform switch
        {
            WorldSiteLandform.Mountain => new[] { ArenaZone.Forest, ArenaZone.Highland, ArenaZone.Highland, ArenaZone.Meadow, ArenaZone.Highland, ArenaZone.Highland, ArenaZone.Highland },
            WorldSiteLandform.Wetland => new[] { ArenaZone.Forest, ArenaZone.Forest, ArenaZone.Meadow, ArenaZone.Forest, ArenaZone.Forest, ArenaZone.Meadow, ArenaZone.Highland },
            _ => habitat switch
            {
                WyrmrealmHabitat.WetForest or WyrmrealmHabitat.SnowboundPines or WyrmrealmHabitat.FloodedCloister or WyrmrealmHabitat.MirrorMere =>
                    new[] { ArenaZone.Forest, ArenaZone.Forest, ArenaZone.Forest, ArenaZone.Meadow, ArenaZone.Forest, ArenaZone.Highland, ArenaZone.Forest },
                WyrmrealmHabitat.OpenField or WyrmrealmHabitat.WhiteoutPlain =>
                    new[] { ArenaZone.Forest, ArenaZone.Meadow, ArenaZone.Meadow, ArenaZone.Meadow, ArenaZone.Highland, ArenaZone.Meadow, ArenaZone.Meadow },
                WyrmrealmHabitat.ScorchedApproach or WyrmrealmHabitat.GlacierApproach or WyrmrealmHabitat.Lair or WyrmrealmHabitat.GlacierLair =>
                    new[] { ArenaZone.Forest, ArenaZone.Highland, ArenaZone.Highland, ArenaZone.Meadow, ArenaZone.Highland, ArenaZone.Highland, ArenaZone.Meadow },
                _ => influence >= .55
                    ? new[] { ArenaZone.Forest, ArenaZone.Highland, ArenaZone.Meadow, ArenaZone.Forest, ArenaZone.Highland, ArenaZone.Meadow, ArenaZone.Highland }
                    : new[] { ArenaZone.Forest, ArenaZone.Highland, ArenaZone.Forest, ArenaZone.Meadow, ArenaZone.Forest, ArenaZone.Meadow, ArenaZone.Highland },
            },
        };
        var seeds = new List<(double X, double Y)>();
        var first = fields.Count > 0
            ? candidates.OrderBy(cell => Math.Pow(cell % columns - fields[0].Column, 2) + Math.Pow(cell / columns - fields[0].Row, 2)).First()
            : candidates[rng.Next(candidates.Count)];
        seeds.Add((first % columns, first / columns));
        while (seeds.Count < biomes.Length)
        {
            // Farthest of a few random candidates, so the regions spread out instead of bunching.
            (double X, double Y) best = default;
            var bestSpread = -1.0;
            for (var sample = 0; sample < 24; sample++)
            {
                var cell = candidates[rng.Next(candidates.Count)];
                var (x, y) = (cell % columns, cell / columns);
                var spread = seeds.Min(seed => Math.Sqrt((seed.X - x) * (seed.X - x) + (seed.Y - y) * (seed.Y - y)));
                if (spread > bestSpread) { bestSpread = spread; best = (x, y); }
            }
            seeds.Add(best);
        }
        var warp = rng.Next();
        for (var index = 0; index < zone.Length; index++)
        {
            var (x, y) = (index % columns, index / columns);
            var nearest = 0;
            var nearestDistance = double.MaxValue;
            for (var s = 0; s < seeds.Count; s++)
            {
                var distance = Math.Sqrt((seeds[s].X - x) * (seeds[s].X - x) + (seeds[s].Y - y) * (seeds[s].Y - y)) + Noise(warp + s * 13, x / 7.0, y / 7.0) * 5;
                if (distance < nearestDistance) { nearestDistance = distance; nearest = s; }
            }
            zone[index] = biomes[nearest];
        }
        return zone;
    }

    /// <summary>Marks an irregular, slightly stretched blob of about the given mean radius (cells) on the mask.</summary>
    public static void Blob(bool[] mask, int columns, int rows, (int X, int Y) centre, double radius, Random rng)
    {
        var phases = new[] { rng.NextDouble() * 6.28, rng.NextDouble() * 6.28, rng.NextDouble() * 6.28 };
        var stretch = 1 + rng.NextDouble() * .3;
        var alongX = rng.Next(2) == 0;
        var reach = (int)Math.Ceiling(radius * 1.6) + 1;
        for (var row = Math.Max(0, centre.Y - reach); row <= Math.Min(rows - 1, centre.Y + reach); row++)
            for (var column = Math.Max(0, centre.X - reach); column <= Math.Min(columns - 1, centre.X + reach); column++)
            {
                double dx = column - centre.X, dy = row - centre.Y;
                if (alongX) (dx, dy) = (dx / stretch, dy * stretch); else (dx, dy) = (dx * stretch, dy / stretch);
                var angle = Math.Atan2(dy, dx);
                var edge = radius * (1 + .17 * Math.Sin(2 * angle + phases[0]) + .1 * Math.Sin(3 * angle + phases[1]) + .06 * Math.Sin(5 * angle + phases[2]));
                if (Math.Sqrt(dx * dx + dy * dy) <= edge) mask[row * columns + column] = true;
            }
    }

    /// <summary>Broad walkable rises in the meadow zones and, from the Scorched band, shallow dells: voxel terraces of at most a couple of microcells per column.</summary>
    public static void Hills(Random rng, ArenaTerrainGrid grid, byte[] zone, int[] routeDistance, double influence)
    {
        var seed = rng.Next();
        var amplitude = 9.0;
        var dells = influence >= .25;
        for (var row = 0; row < grid.Rows; row++)
            for (var column = 0; column < grid.Columns; column++)
            {
                if (zone[row * grid.Columns + column] != ArenaZone.Meadow || !Open(grid, column, row)) continue;
                var near = routeDistance[row * grid.Columns + column];
                if (near < 2) continue;
                var fade = Math.Min(1.0, (near - 1) / 3.0);
                // Hills die away toward the edge of the meadow, so they never step against the flat ground of the next zone.
                var border = 4;
                for (var dy = -3; dy <= 3; dy++)
                    for (var dx = -3; dx <= 3; dx++)
                        if (grid.Contains(column + dx, row + dy) && zone[(row + dy) * grid.Columns + column + dx] != ArenaZone.Meadow) border = Math.Min(border, Math.Max(Math.Abs(dx), Math.Abs(dy)));
                fade *= Math.Min(1.0, border / 3.0);
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
                    // A trunk or boulder is a standing object, not a cliff: no ledges or rubble apron around it.
                    if (grid.Material(nc, nr) is ArenaTerrainMaterial.Wood or ArenaTerrainMaterial.Boulder) continue;
                    var neighbour = whole[nr * columns + nc];
                    var drop = own - neighbour;
                    for (var along = 0; along < Micro; along++)
                    {
                        var global = side < 2 ? row * Micro + along : column * Micro + along;
                        // Any ledge taller than a step meanders: the 1 m terraces as well as the tall cliffs, so no wall runs as a straight line.
                        if (drop > Step)
                        {
                            var edge = Math.Min(Meander(side, global, 0), drop >= 9 ? 5 : 3);
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
    /// Highland: foothills climb from the border of the zone in half-metre steps (walkable), then terraces of 1, 2 and 3 m follow the contours
    /// of broad noise, so the cliffs run in long, connected lines instead of lone blocks. Two or three passes ramp from the foot to the top.
    /// The arena's own edge counts as deep inland, so highland against the border is a wall of rock.
    /// </summary>
    public static void Highlands(Random rng, ArenaTerrainGrid grid, byte[] zone, int[] routeDistance)
    {
        var (columns, rows) = (grid.Columns, grid.Rows);
        var seed = rng.Next();
        var depth = new int[columns * rows];
        var queue = new Queue<int>();
        var offsets = new[] { (1, 0), (-1, 0), (0, 1), (0, -1) };
        for (var index = 0; index < depth.Length; index++)
        {
            if (zone[index] != ArenaZone.Highland) continue;
            var (column, row) = (index % columns, index / columns);
            if (offsets.Any(o => grid.Contains(column + o.Item1, row + o.Item2) && zone[(row + o.Item2) * columns + column + o.Item1] != ArenaZone.Highland))
            { depth[index] = 1; queue.Enqueue(index); }
        }
        while (queue.Count > 0)
        {
            var index = queue.Dequeue();
            foreach (var (dx, dy) in offsets)
            {
                var (c, r) = (index % columns + dx, index / columns + dy);
                if (!grid.Contains(c, r) || zone[r * columns + c] != ArenaZone.Highland || depth[r * columns + c] != 0) continue;
                depth[r * columns + c] = depth[index] + 1;
                queue.Enqueue(r * columns + c);
            }
        }
        // Terraces follow the contours of broad noise. A cell that disagrees with most of its neighbours is pulled to theirs, twice over, so
        // there are no one-cell steps or chimneys: cliffs are long, rounded lines.
        var tiers = new int[columns * rows];
        for (var index = 0; index < tiers.Length; index++)
        {
            var contour = Noise(seed, index % columns / 5.0, index / columns / 5.0);
            tiers[index] = contour > .3 ? 24 : contour > -.2 ? 16 : 8;
        }
        for (var round = 0; round < 2; round++)
        {
            var smoothed = (int[])tiers.Clone();
            for (var index = 0; index < tiers.Length; index++)
            {
                if (zone[index] != ArenaZone.Highland) continue;
                var (column, row) = (index % columns, index / columns);
                var same = offsets.Where(o => grid.Contains(column + o.Item1, row + o.Item2)).Select(o => tiers[(row + o.Item2) * columns + column + o.Item1])
                    .GroupBy(tier => tier).OrderByDescending(group => group.Count()).First();
                if (same.Key != tiers[index] && same.Count() >= 3) smoothed[index] = same.Key;
            }
            tiers = smoothed;
        }
        // Passes: from a cell on the foothill edge, inland one step deeper each time, so the height ramps by a half metre per cell.
        var pass = new int[columns * rows];
        var starts = Enumerable.Range(0, depth.Length).Where(i => depth[i] == 1 && routeDistance[i] >= 3).ToList();
        for (var made = 0; made < 3 && starts.Count > 0; made++)
        {
            var current = starts[rng.Next(starts.Count)];
            for (var step = 1; step <= 10; step++)
            {
                pass[current] = Math.Max(pass[current], step);
                var next = offsets.Select(o => (C: current % columns + o.Item1, R: current / columns + o.Item2))
                    .Where(n => grid.Contains(n.C, n.R) && depth[n.R * columns + n.C] == depth[current] + 1).ToList();
                if (next.Count == 0) break;
                var pick = next[rng.Next(next.Count)];
                current = pick.R * columns + pick.C;
            }
        }
        for (var index = 0; index < depth.Length; index++)
        {
            var (column, row) = (index % columns, index / columns);
            if (zone[index] != ArenaZone.Highland || routeDistance[index] < 3 || !Open(grid, column, row)) continue;
            var tier = tiers[index];
            var height = depth[index] <= 1 ? Step : depth[index] == 2 ? 2 * Step : tier;
            if (pass[index] > 0) height = Math.Min(height, pass[index] * Step);
            grid.Set(column, row, height, ArenaTerrainMaterial.Stone);
        }
    }

    /// <summary>
    /// Knolls: two or three grassy hills in the meadow with sheer rock faces on three sides and a ramp of half-metre steps up the fourth, 1 or 2 m
    /// high. They are stone for every gameplay rule (the client draws the turf cap and the stone faces), so Fireballs can dig through the cap
    /// into the rock. Each is a lobed blob, never a rectangle or a circle.
    /// </summary>
    public static void Knolls(Random rng, ArenaTerrainGrid grid, byte[] zone, int[] routeDistance)
    {
        var (columns, rows) = (grid.Columns, grid.Rows);
        var count = 2 + rng.Next(2);
        for (int made = 0, attempt = 0; made < count && attempt < 400; attempt++)
        {
            var centre = (X: 4 + rng.Next(columns - 8), Y: 6 + rng.Next(rows - 12));
            var (rx, ry) = (2.6 + rng.NextDouble() * 1.6, 2.6 + rng.NextDouble() * 1.6);
            var phases = new[] { rng.NextDouble() * 6.28, rng.NextDouble() * 6.28, rng.NextDouble() * 6.28 };
            var height = rng.Next(2) == 0 ? 8 : 16;
            var (rdx, rdy) = rng.Next(4) switch { 0 => (0, -1), 1 => (1, 0), 2 => (0, 1), _ => (-1, 0) };
            var inside = new HashSet<(int, int)>();
            for (var row = centre.Y - 7; row <= centre.Y + 7; row++)
                for (var column = centre.X - 7; column <= centre.X + 7; column++)
                {
                    var (dx, dy) = (column - centre.X, row - centre.Y);
                    var angle = Math.Atan2(dy, dx);
                    var edge = Math.Sqrt(dx * dx / (rx * rx) + dy * dy / (ry * ry)) + .2 * Math.Sin(2 * angle + phases[0]) + .14 * Math.Sin(3 * angle + phases[1]) + .08 * Math.Sin(5 * angle + phases[2]);
                    if (edge < 1) inside.Add((column, row));
                }
            if (inside.Count < 12 || inside.Any(cell => !grid.Contains(cell.Item1, cell.Item2) || zone[cell.Item2 * columns + cell.Item1] == ArenaZone.Forest
                || routeDistance[cell.Item2 * columns + cell.Item1] < 3 || !Open(grid, cell.Item1, cell.Item2))) continue;
            foreach (var (column, row) in inside)
            {
                // Steps from the ramp-side edge: 1 on the lowest cell, so the height climbs a half metre per cell.
                var steps = 1;
                for (var (c, r) = (column + rdx, row + rdy); inside.Contains((c, r)); (c, r) = (c + rdx, r + rdy)) steps++;
                grid.Set(column, row, Math.Min(height, steps * Step), ArenaTerrainMaterial.Stone);
            }
            made++;
        }
    }

    /// <summary>
    /// Boulders: fallen rock at the foot of the highland cliffs, and a few standing stones (a pillar with smaller rocks leaning on it) on the
    /// meadow hills. A boulder is stone for every gameplay rule and breaks like it; the client draws it as an upright rock that shrinks as it is worn down.
    /// </summary>
    public static void Boulders(Random rng, ArenaTerrainGrid grid, byte[] zone, int[] routeDistance)
    {
        var (columns, rows) = (grid.Columns, grid.Rows);
        var feet = new List<(int Column, int Row, int Cliff)>();
        for (var row = 1; row < rows - 1; row++)
            for (var column = 1; column < columns - 1; column++)
            {
                if (zone[row * columns + column] == ArenaZone.Forest || routeDistance[row * columns + column] < 3 || !Open(grid, column, row)) continue;
                var cliff = 0;
                for (var dy = -1; dy <= 1; dy++)
                    for (var dx = -1; dx <= 1; dx++)
                        if (grid.Material(column + dx, row + dy) == ArenaTerrainMaterial.Stone) cliff = Math.Max(cliff, grid.Surface(column + dx, row + dy));
                if (cliff >= 12) feet.Add((column, row, cliff));
            }
        foreach (var (column, row, cliff) in feet)
            if (rng.NextDouble() < .2) grid.Set(column, row, cliff >= 20 ? 8 : 4, ArenaTerrainMaterial.Boulder);
        var standing = 2 + rng.Next(2);
        for (int placed = 0, attempt = 0; placed < standing && attempt < 300; attempt++)
        {
            var (column, row) = (2 + rng.Next(columns - 4), 4 + rng.Next(rows - 8));
            if (zone[row * columns + column] == ArenaZone.Forest || routeDistance[row * columns + column] < 4 || !Open(grid, column, row)) continue;
            var top = new[] { 12, 16, 20 }[rng.Next(3)];
            grid.Set(column, row, top, ArenaTerrainMaterial.Boulder);
            placed++;
            // An outcrop, not a post: lower stones lean against it, stepping down so each rises at most a step above the next.
            for (var satellite = 0; satellite < 1 + rng.Next(3); satellite++)
            {
                var (sc, sr) = (column + rng.Next(3) - 1, row + rng.Next(3) - 1);
                if ((sc == column && sr == row) || !Open(grid, sc, sr) || routeDistance[sr * columns + sc] < 3) continue;
                grid.Set(sc, sr, Math.Max(Step, top - Step * (1 + rng.Next(3))), ArenaTerrainMaterial.Boulder);
            }
        }
    }

    /// <summary>
    /// Woodland: trunks (1.5 to 3.5 m, shorter and charred toward the Wyrm) fill the forest zones in clumps around glades, thickening over three
    /// columns from the road so the road is lined by a tree line, never within two columns of it. A trunk is ordinary terrain (material Wood):
    /// it blocks walking and shots, and fire wears it away like rock. Trunks never touch orthogonally, so a forest can be walked. The canopy is
    /// presentation only. A thinner tree line also frames the two long edges of the arena wherever the ground there is open.
    /// </summary>
    public static void Forests(Random rng, ArenaTerrainGrid grid, byte[] zone, int[] routeDistance, double influence)
    {
        var (columns, rows) = (grid.Columns, grid.Rows);
        var seed = rng.Next();
        var density = influence < .25 ? .11 : influence < .55 ? .08 : influence < .85 ? .05 : .03;
        int TrunkHeight() => (influence >= .85 ? 8 : 16) + Step * rng.Next(4);
        bool Free(int column, int row)
        {
            foreach (var (dx, dy) in new[] { (1, 0), (-1, 0), (0, 1), (0, -1) })
                if (grid.Contains(column + dx, row + dy) && grid.Material(column + dx, row + dy) is ArenaTerrainMaterial.Wood or ArenaTerrainMaterial.Lava) return false;
            return true;
        }
        for (var row = 2; row < rows - 2; row++)
            for (var column = 1; column < columns - 1; column++)
            {
                var index = row * columns + column;
                if (zone[index] != ArenaZone.Forest || routeDistance[index] < 3 || !Open(grid, column, row)) continue;
                var clump = Math.Clamp(((Noise(seed, column / 4.0, row / 4.0) + 1) / 2 - .25) / .4, 0, 1);
                if (clump < .12) continue; // a glade
                var fade = Math.Min(1.0, (routeDistance[index] - 2) / 3.0);
                // The wood thins out toward the edge of its zone (a ragged tree line, not a wall of trunks along a border).
                var border = 5;
                for (var dy = -4; dy <= 4; dy++)
                    for (var dx = -4; dx <= 4; dx++)
                        if (grid.Contains(column + dx, row + dy) && zone[(row + dy) * columns + column + dx] != ArenaZone.Forest) border = Math.Min(border, Math.Max(Math.Abs(dx), Math.Abs(dy)));
                fade *= Math.Min(1.0, (border + 1) / 5.0);
                if (rng.NextDouble() >= density * 4.5 * clump * clump * fade || !Free(column, row)) continue;
                grid.Set(column, row, TrunkHeight(), ArenaTerrainMaterial.Wood);
            }
        var edge = .7 - influence * .55;
        for (var row = 2; row < rows - 2; row += 2)
            foreach (var side in new[] { 0, columns - 2 })
            {
                var (column, y) = (side + rng.Next(2), row + rng.Next(2));
                if (rng.NextDouble() >= edge || !grid.Contains(column, y) || !Open(grid, column, y) || routeDistance[y * columns + column] < 3 || !Free(column, y)) continue;
                grid.Set(column, y, TrunkHeight(), ArenaTerrainMaterial.Wood);
            }
    }

    /// <summary>
    /// Lava pools with a raised basalt lip, from the Burning band onward: lobed, uneven outlines with inlets and bays, one or two satellite
    /// puddles and the odd islet of rock, never an ellipse. Returns their centres in microcells.
    /// </summary>
    public static List<(int X, int Y)> LavaPools(Random rng, ArenaTerrainGrid grid, int[] routeDistance, byte[] zone, double influence)
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
            for (var attempt = 0; attempt < 300; attempt++)
            {
                var (cx, cy) = (3 + rng.Next(grid.Columns - 6), 5 + rng.Next(grid.Rows - 10));
                if (routeDistance[cy * grid.Columns + cx] < Math.Max(rx, ry) * 1.1 + 2 || zone[cy * grid.Columns + cx] == ArenaZone.Forest) continue;
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

    /// <summary>
    /// Scars of old blasts, left in the open fields where the fights were: real round voxel craters dug with the same rule a Fireball uses,
    /// so they have strata and can be dug deeper. They stay three columns clear of the road.
    /// </summary>
    public static List<(int X, int Y)> ScarCraters(Random rng, ArenaTerrainGrid grid, bool[] protectedCells, bool[] open, int[] roadDistance, double influence, ref long impactId)
    {
        var centres = new List<(int X, int Y)>();
        if (influence < .25) return centres;
        var cells = Enumerable.Range(0, open.Length).Where(i => open[i] && roadDistance[i] >= 3 && grid.Material(i % grid.Columns, i / grid.Columns) != ArenaTerrainMaterial.Lava).ToList();
        var count = 2 + (int)Math.Floor(influence * 6);
        for (var scar = 0; scar < count && cells.Count > 0; scar++)
        {
            var cell = cells[rng.Next(cells.Count)];
            var (column, row) = (cell % grid.Columns, cell / grid.Columns);
            // A scar is a cluster of overlapping blasts, not one bowl: a big first impact, then two or three more of different power a few
            // tens of centimetres off, so the outline and the strata steps are irregular rather than concentric rings.
            var (cx, cy) = ((column + .5) * ArenaTerrainGrid.CellUnits, (row + .5) * ArenaTerrainGrid.CellUnits);
            Blast(grid, protectedCells, cx, cy, 3, ref impactId);
            for (var extra = 0; extra < 2 + rng.Next(2); extra++)
            {
                var angle = rng.NextDouble() * Math.PI * 2;
                var reach = (.35 + rng.NextDouble() * .75) * ArenaTerrainGrid.CellUnits;
                Blast(grid, protectedCells, cx + Math.Cos(angle) * reach, cy + Math.Sin(angle) * reach, 1 + rng.Next(3), ref impactId);
            }
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
        bool Free(int x, int y) => x >= 0 && y >= 0 && x < width && y < height && !protectedCells[y / Micro * grid.Columns + x / Micro] && routeDistance[y / Micro * grid.Columns + x / Micro] >= 1;
        for (var vent = 0; vent < 2; vent++)
            for (var attempt = 0; attempt < 30; attempt++)
            {
                var candidate = (Micro + rng.Next(width - 2 * Micro), 3 * Micro + rng.Next(height - 6 * Micro));
                if (!Free(candidate.Item1, candidate.Item2)) continue;
                all.Add(candidate);
                break;
            }
        var count = 1 + (int)Math.Floor(influence * 2.5);

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
