using System.Text.Json;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// One column changed by an impact. Presentation, audio, VFX and navigation consume this; none of them decide it.
/// <see cref="OldFine"/> and <see cref="NewFine"/> are the 64 microcolumn heights before and after (null while the column is whole).
/// </summary>
public sealed record ArenaTerrainChange(int Column, int Row, int OldSurface, int NewSurface,
    ArenaTerrainMaterial OldMaterial, ArenaTerrainMaterial NewMaterial)
{
    public short[]? OldFine { get; init; }
    public short[]? NewFine { get; init; }
    /// <summary>Stone wear counters before and after (null while the column has taken no stone damage).</summary>
    public byte[]? OldWear { get; init; }
    public byte[]? NewWear { get; init; }
}

/// <summary>
/// A confirmed C# impact with a stable identity. Power 1 ordinary, 2 splash or Detonation, 3 Meteor Heart.
/// Without a <paramref name="Direction"/> the blast lands on the ground and digs a crater from above. With one, a shot flying at
/// <paramref name="FaceHeight"/> microcells struck a wall or cliff face travelling that way and bites into the face from the side.
/// </summary>
public sealed record ArenaTerrainImpact(long Id, Vector2D Position, int Power, Vector2D? Direction = null, int FaceHeight = 0);

/// <summary>Progressive excavation rules. Proposed values: tune in playtests.</summary>
public static class ArenaTerrainMutation
{
    /// <summary>The route never drops below half a metre, so its neighbouring columns always stay a single step apart.</summary>
    public const int RouteFloorMicrocells = -ArenaTerrainGrid.MaxStepMicrocells;

    /// <summary>Crater radius in world units: an ordinary Fireball digs a bowl inside about one block, bigger magic more.</summary>
    public static double RadiusUnits(int power) => power switch
    {
        <= 1 => 0.75,
        2 => 1.25,
        3 => 1.8,
        4 => 2.3,
        _ => 2.8,
    } * ArenaTerrainGrid.CellUnits;

    /// <summary>
    /// Radius in microcells of the half-sphere a side hit bites out of a face. It removes about the same volume as the cap of the
    /// crater the same power digs from above (energy is conserved between the two directions): 37 cm, 62 cm and 1 m.
    /// </summary>
    public static int FaceBiteRadiusMicrocells(int power) => power switch { <= 1 => 3, 2 => 5, 3 => 8, 4 => 10, _ => 12 };

    public static IReadOnlyList<ArenaTerrainChange> Apply(ArenaTerrainGrid grid, ArenaTerrainImpact impact, bool[]? protectedCells)
    {
        ArgumentNullException.ThrowIfNull(grid);
        var power = Math.Clamp(impact.Power, 1, 5);
        var hits = (impact.Direction is { } direction && direction.Length > 1e-9
            ? FaceHits(grid, impact, direction.Normalized(), power)
            : CraterHits(impact, power)).ToList();
        var perColumn = ArenaTerrainGrid.MicroPerColumn;
        var touched = new List<(int Column, int Row, int Surface, ArenaTerrainMaterial Material, short[]? Fine, byte[]? Wear)>();
        var seen = new HashSet<int>();
        void Touch(int column, int row)
        {
            if (seen.Add(row * grid.Columns + column))
                touched.Add((column, row, grid.Surface(column, row), grid.Material(column, row), grid.FineHeights(column, row), grid.FineWear(column, row)));
        }
        foreach (var (gx, gy, depth) in hits)
        {
            var column = (int)Math.Floor(gx / (double)perColumn);
            var row = (int)Math.Floor(gy / (double)perColumn);
            if (!grid.Contains(column, row)) continue;
            Touch(column, row);
            var floor = protectedCells is { Length: > 0 } && protectedCells[row * grid.Columns + column]
                ? RouteFloorMicrocells : ArenaTerrainGrid.BedrockMicrocells;
            grid.ExcavateMicro(column, row, gx - column * perColumn, gy - row * perColumn, depth, floor);
        }
        Settle(grid, hits, protectedCells, Touch);

        var changes = new List<ArenaTerrainChange>();
        foreach (var (column, row, surface, material, fine, oldWear) in touched)
        {
            var after = grid.FineHeights(column, row);
            var newWear = grid.FineWear(column, row);
            var heightsSame = fine is null && after is null || fine is not null && after is not null && fine.AsSpan().SequenceEqual(after);
            var wearSame = oldWear is null && newWear is null || oldWear is not null && newWear is not null && oldWear.AsSpan().SequenceEqual(newWear);
            if (heightsSame && wearSame) continue;
            changes.Add(new ArenaTerrainChange(column, row, surface, grid.Surface(column, row), material, grid.Material(column, row))
            {
                OldFine = fine,
                NewFine = after,
                OldWear = oldWear,
                NewWear = newWear,
            });
        }
        return changes;
    }

    /// <summary>The most a one-microcell-wide fin or spire may stand above what holds it up: 50 cm. Anything taller falls.</summary>
    public const int UnsupportedLimitMicrocells = 4;

    /// <summary>
    /// No voxel is left floating: after an impact, microcolumns that stand on a sliver (both neighbours along an axis, or all four, are
    /// at least <see cref="UnsupportedLimitMicrocells"/> lower) collapse to just above their highest support, rippling outward until stable.
    /// A heightfield cannot hold an overhang, so a side bite that undercuts a wall brings the unsupported rock down instead of hanging it.
    /// </summary>
    private static void Settle(ArenaTerrainGrid grid, List<(int Gx, int Gy, int Depth)> hits, bool[]? protectedCells, Action<int, int> touch)
    {
        var region = new SortedSet<(int Gy, int Gx)>();
        foreach (var (gx, gy, _) in hits)
            for (var dy = -1; dy <= 1; dy++)
                for (var dx = -1; dx <= 1; dx++) region.Add((gy + dy, gx + dx));
        SettleRegion(grid, region, protectedCells, touch);
    }

    /// <summary>Generation-time stability: leaves no fin or spire anywhere among the subdivided columns, so the first impact never meets one.</summary>
    internal static void SettleAll(ArenaTerrainGrid grid, bool[]? protectedCells)
    {
        // One flat array over the whole arena so the sweep is a few hundred thousand reads, not a sorted-set walk.
        var per = ArenaTerrainGrid.MicroPerColumn;
        var (width, height) = (grid.Columns * per, grid.Rows * per);
        var heights = new int[width * height];
        for (var gy = 0; gy < height; gy++)
            for (var gx = 0; gx < width; gx++)
                heights[gy * width + gx] = grid.MicroSurface(gx / per, gy / per, gx % per, gy % per);
        var limit = UnsupportedLimitMicrocells;
        for (var pass = 0; pass < 6; pass++)
        {
            var any = false;
            for (var gy = 0; gy < height; gy++)
                for (var gx = 0; gx < width; gx++)
                {
                    var (column, row) = (gx / per, gy / per);
                    if (!grid.IsSubdivided(column, row) && !(gx % per == 0 || gx % per == per - 1 || gy % per == 0 || gy % per == per - 1)) continue;
                    var own = heights[gy * width + gx];
                    var west = gx > 0 ? heights[gy * width + gx - 1] : own; var east = gx < width - 1 ? heights[gy * width + gx + 1] : own;
                    var north = gy > 0 ? heights[(gy - 1) * width + gx] : own; var south = gy < height - 1 ? heights[(gy + 1) * width + gx] : own;
                    var thinX = own - west >= limit && own - east >= limit;
                    var thinY = own - north >= limit && own - south >= limit;
                    if (!thinX && !thinY) continue;
                    if (protectedCells is { Length: > 0 } && protectedCells[row * grid.Columns + column]) continue;
                    var support = thinX && thinY ? Math.Max(Math.Max(west, east), Math.Max(north, south))
                        : thinX ? Math.Max(west, east) : Math.Max(north, south);
                    if (grid.LowerMicroTo(column, row, gx % per, gy % per, support + 2) == 0) continue;
                    heights[gy * width + gx] = grid.MicroSurface(column, row, gx % per, gy % per);
                    any = true;
                }
            if (!any) break;
        }
    }
    private static void SettleRegion(ArenaTerrainGrid grid, SortedSet<(int Gy, int Gx)> region, bool[]? protectedCells, Action<int, int> touch)
    {
        var perColumn = ArenaTerrainGrid.MicroPerColumn;
        int? Height(int gx, int gy)
        {
            var (column, row) = ((int)Math.Floor(gx / (double)perColumn), (int)Math.Floor(gy / (double)perColumn));
            return grid.Contains(column, row) ? grid.MicroSurface(column, row, gx - column * perColumn, gy - row * perColumn) : null;
        }
        for (var pass = 0; pass < 6 && region.Count > 0; pass++)
        {
            var next = new SortedSet<(int Gy, int Gx)>();
            foreach (var (gy, gx) in region)
            {
                if (Height(gx, gy) is not { } own) continue;
                var west = Height(gx - 1, gy) ?? own; var east = Height(gx + 1, gy) ?? own;
                var north = Height(gx, gy - 1) ?? own; var south = Height(gx, gy + 1) ?? own;
                var limit = UnsupportedLimitMicrocells;
                var thinX = own - west >= limit && own - east >= limit;
                var thinY = own - north >= limit && own - south >= limit;
                if (!thinX && !thinY) continue;
                var support = thinX && thinY ? Math.Max(Math.Max(west, east), Math.Max(north, south))
                    : thinX ? Math.Max(west, east) : Math.Max(north, south);
                var (column, row) = ((int)Math.Floor(gx / (double)perColumn), (int)Math.Floor(gy / (double)perColumn));
                var floor = protectedCells is { Length: > 0 } && protectedCells[row * grid.Columns + column]
                    ? RouteFloorMicrocells : ArenaTerrainGrid.BedrockMicrocells;
                touch(column, row);
                if (grid.LowerMicroTo(column, row, gx - column * perColumn, gy - row * perColumn, support + 2, floor) == 0) continue;
                // What stood beside it may now be a fin in turn.
                foreach (var (ox, oy) in new[] { (1, 0), (-1, 0), (0, 1), (0, -1) }) next.Add((gy + oy, gx + ox));
            }
            region = next;
        }
    }

    // From above: a smooth bowl, deepest at the centre and steep near the rim.
    private static IEnumerable<(int Gx, int Gy, int Depth)> CraterHits(ArenaTerrainImpact impact, int power)
    {
        var radius = RadiusUnits(power);
        var micro = ArenaTerrainGrid.MicroUnits;
        var firstX = (int)Math.Floor((impact.Position.X - radius) / micro);
        var lastX = (int)Math.Floor((impact.Position.X + radius) / micro);
        var firstY = (int)Math.Floor((impact.Position.Y - radius) / micro);
        var lastY = (int)Math.Floor((impact.Position.Y + radius) / micro);
        for (var gy = firstY; gy <= lastY; gy++)
            for (var gx = firstX; gx <= lastX; gx++)
            {
                var distance = Vector2D.Distance(impact.Position, new Vector2D((gx + .5) * micro, (gy + .5) * micro));
                if (distance >= radius) continue;
                var depth = (int)Math.Ceiling(power * (1 - distance * distance / (radius * radius)));
                if (depth > 0) yield return (gx, gy, depth);
            }
    }

    /// <summary>
    /// From the side: a half-sphere centred just inside the face at the height the shot flew at. Only microcolumns the sphere
    /// actually reaches (their top is above the sphere's lower surface) are hit, so open ground in front of the wall is never
    /// touched and the wall loses its exposed edge and top near the contact. Each hit microcolumn takes the same impact points
    /// a crater would give it, and stone still wears rather than vanishing, so a face recedes progressively.
    /// </summary>
    private static IEnumerable<(int Gx, int Gy, int Depth)> FaceHits(ArenaTerrainGrid grid, ArenaTerrainImpact impact, Vector2D direction, int power)
    {
        var radius = FaceBiteRadiusMicrocells(power);
        var micro = ArenaTerrainGrid.MicroUnits;
        var perColumn = ArenaTerrainGrid.MicroPerColumn;
        var centre = impact.Position + direction * (0.4 * radius * micro);
        var reach = radius * micro;
        var firstX = (int)Math.Floor((centre.X - reach) / micro);
        var lastX = (int)Math.Floor((centre.X + reach) / micro);
        var firstY = (int)Math.Floor((centre.Y - reach) / micro);
        var lastY = (int)Math.Floor((centre.Y + reach) / micro);
        for (var gy = firstY; gy <= lastY; gy++)
            for (var gx = firstX; gx <= lastX; gx++)
            {
                var column = (int)Math.Floor(gx / (double)perColumn);
                var row = (int)Math.Floor(gy / (double)perColumn);
                if (!grid.Contains(column, row)) continue;
                var distance = Vector2D.Distance(centre, new Vector2D((gx + .5) * micro, (gy + .5) * micro)) / micro;
                if (distance >= radius) continue;
                var sphereFloor = impact.FaceHeight - Math.Sqrt(radius * radius - distance * distance);
                if (grid.MicroSurface(column, row, gx - column * perColumn, gy - row * perColumn) <= sphereFloor) continue;
                yield return (gx, gy, Math.Max(1, (int)Math.Ceiling(power * (1 - distance * distance / (radius * radius)))));
            }
    }

    /// <summary>Undo an applied impact exactly.</summary>
    public static void Revert(ArenaTerrainGrid grid, IReadOnlyList<ArenaTerrainChange> changes)
    {
        for (var index = changes.Count - 1; index >= 0; index--)
            grid.Restore(changes[index].Column, changes[index].Row, changes[index].OldSurface, changes[index].OldMaterial, changes[index].OldFine, changes[index].OldWear);
    }
}
/// <summary>Versioned save of player-made terrain damage for one arena visit, keyed by site so campaign history can adopt it later.</summary>
public sealed record ArenaTerrainRecord(int Version, string SiteKey, int Columns, int Rows,
    IReadOnlyList<long> AppliedImpactIds, IReadOnlyList<ArenaTerrainRecord.Column> Changed)
{
    public const int CurrentVersion = 1;

    public sealed record Column(int X, int Y, int Surface, ArenaTerrainMaterial Material, short[]? Fine = null, byte[]? Wear = null);

    /// <summary>Record only the columns that differ from the freshly generated baseline.</summary>
    private static bool Same<T>(T[]? left, T[]? right) where T : IEquatable<T> =>
        left is null ? right is null : right is not null && left.AsSpan().SequenceEqual(right);
    public static ArenaTerrainRecord Capture(string siteKey, ArenaTerrainGrid baseline, ArenaTerrainGrid current, IEnumerable<long> appliedImpactIds)
    {
        var changed = new List<Column>();
        for (var row = 0; row < current.Rows; row++)
            for (var column = 0; column < current.Columns; column++)
                if (current.Surface(column, row) != baseline.Surface(column, row) || current.Material(column, row) != baseline.Material(column, row)
                    || !Same(current.FineHeights(column, row), baseline.FineHeights(column, row))
                    || !Same(current.FineWear(column, row), baseline.FineWear(column, row)))
                    changed.Add(new Column(column, row, current.Surface(column, row), current.Material(column, row), current.FineHeights(column, row), current.FineWear(column, row)));
        return new ArenaTerrainRecord(CurrentVersion, siteKey, current.Columns, current.Rows, appliedImpactIds.Order().ToArray(), changed);
    }

    /// <summary>Apply a record onto a freshly generated grid. Foreign sites, versions, sizes or malformed columns are rejected.</summary>
    public void Restore(string expectedSiteKey, ArenaTerrainGrid grid)
    {
        if (Version != CurrentVersion) throw new InvalidDataException("Unsupported terrain record version.");
        if (SiteKey != expectedSiteKey) throw new InvalidDataException("Terrain record belongs to another site.");
        if (Columns != grid.Columns || Rows != grid.Rows) throw new InvalidDataException("Terrain record has a different size.");
        var seen = new HashSet<(int, int)>();
        foreach (var column in Changed)
        {
            if (!grid.Contains(column.X, column.Y) || !seen.Add((column.X, column.Y)) ||
                column.Surface < ArenaTerrainGrid.BedrockMicrocells || !Enum.IsDefined(column.Material) ||
                column.Fine is { } fine && (fine.Length != ArenaTerrainGrid.MicroCount || fine.Any(height => height < ArenaTerrainGrid.BedrockMicrocells)) ||
                column.Wear is { } wear && (wear.Length != ArenaTerrainGrid.MicroCount || wear.Any(counter => counter >= ArenaTerrainGrid.StoneWearPerMicrocell)))
                throw new InvalidDataException("Terrain record contains an invalid column.");
        }
        foreach (var column in Changed) grid.Restore(column.X, column.Y, column.Surface, column.Material, column.Fine, column.Wear);
    }

    public string ToJson() => JsonSerializer.Serialize(this);

    public static ArenaTerrainRecord FromJson(string json) =>
        JsonSerializer.Deserialize<ArenaTerrainRecord>(json) ?? throw new InvalidDataException("Empty terrain record.");
}
