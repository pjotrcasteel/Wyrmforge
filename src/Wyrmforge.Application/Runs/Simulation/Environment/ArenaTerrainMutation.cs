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

/// <summary>A confirmed C# impact with a stable identity. Power 1 ordinary, 2 splash or Detonation, 3 Meteor Heart.</summary>
public sealed record ArenaTerrainImpact(long Id, Vector2D Position, int Power);

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
        _ => 1.8,
    } * ArenaTerrainGrid.CellUnits;

    public static IReadOnlyList<ArenaTerrainChange> Apply(ArenaTerrainGrid grid, ArenaTerrainImpact impact, bool[]? protectedCells)
    {
        ArgumentNullException.ThrowIfNull(grid);
        var power = Math.Clamp(impact.Power, 1, 3);
        var radius = RadiusUnits(power);
        var micro = ArenaTerrainGrid.MicroUnits;
        var perColumn = ArenaTerrainGrid.MicroPerColumn;
        var firstX = (int)Math.Floor((impact.Position.X - radius) / micro);
        var lastX = (int)Math.Floor((impact.Position.X + radius) / micro);
        var firstY = (int)Math.Floor((impact.Position.Y - radius) / micro);
        var lastY = (int)Math.Floor((impact.Position.Y + radius) / micro);
        var touched = new List<(int Column, int Row, int Surface, ArenaTerrainMaterial Material, short[]? Fine, byte[]? Wear)>();
        var seen = new HashSet<int>();
        for (var gy = firstY; gy <= lastY; gy++)
            for (var gx = firstX; gx <= lastX; gx++)
            {
                var column = (int)Math.Floor(gx / (double)perColumn);
                var row = (int)Math.Floor(gy / (double)perColumn);
                if (!grid.Contains(column, row)) continue;
                var distance = Vector2D.Distance(impact.Position, new Vector2D((gx + .5) * micro, (gy + .5) * micro));
                if (distance >= radius) continue;
                // A smooth bowl: deepest at the centre, steep near the rim.
                var depth = (int)Math.Ceiling(power * (1 - distance * distance / (radius * radius)));
                if (depth <= 0) continue;
                if (seen.Add(row * grid.Columns + column))
                    touched.Add((column, row, grid.Surface(column, row), grid.Material(column, row), grid.FineHeights(column, row), grid.FineWear(column, row)));
                var floor = protectedCells is { Length: > 0 } && protectedCells[row * grid.Columns + column]
                    ? RouteFloorMicrocells : ArenaTerrainGrid.BedrockMicrocells;
                grid.ExcavateMicro(column, row, gx - column * perColumn, gy - row * perColumn, depth, floor);
            }

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
    public static ArenaTerrainRecord Capture(string siteKey, ArenaTerrainGrid baseline, ArenaTerrainGrid current, IEnumerable<long> appliedImpactIds)
    {
        var changed = new List<Column>();
        for (var row = 0; row < current.Rows; row++)
            for (var column = 0; column < current.Columns; column++)
                if (current.Surface(column, row) != baseline.Surface(column, row) || current.Material(column, row) != baseline.Material(column, row)
                    || current.IsSubdivided(column, row))
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
