using System.Text.Json;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>One column changed by an impact. Presentation, audio, VFX and navigation consume this; none of them decide it.</summary>
public sealed record ArenaTerrainChange(int Column, int Row, int OldSurface, int NewSurface,
    ArenaTerrainMaterial OldMaterial, ArenaTerrainMaterial NewMaterial);

/// <summary>A confirmed C# impact with a stable identity. Power 1 ordinary, 2 splash or Detonation, 3 Meteor Heart.</summary>
public sealed record ArenaTerrainImpact(long Id, Vector2D Position, int Power);

/// <summary>Progressive excavation rules. Proposed values: tune in playtests.</summary>
public static class ArenaTerrainMutation
{
    /// <summary>The route never drops below half a metre, so its neighbouring columns always stay a single step apart.</summary>
    public const int RouteFloorMicrocells = -ArenaTerrainGrid.MaxStepMicrocells;
    /// <summary>Stone takes this many microcells of impact depth before it gives way.</summary>
    public const int StoneHardness = 2;

    public static double RadiusUnits(int power) => power switch
    {
        <= 1 => 1.0,
        2 => 1.6,
        _ => 2.2,
    } * ArenaTerrainGrid.CellUnits;

    public static IReadOnlyList<ArenaTerrainChange> Apply(ArenaTerrainGrid grid, ArenaTerrainImpact impact, bool[]? protectedCells)
    {
        ArgumentNullException.ThrowIfNull(grid);
        var power = Math.Clamp(impact.Power, 1, 3);
        var radius = RadiusUnits(power);
        var (centreColumn, centreRow) = ArenaTerrainGrid.ColumnOf(impact.Position);
        var span = (int)Math.Ceiling(radius / ArenaTerrainGrid.CellUnits) + 1;
        var changes = new List<ArenaTerrainChange>();
        for (var row = centreRow - span; row <= centreRow + span; row++)
            for (var column = centreColumn - span; column <= centreColumn + span; column++)
            {
                if (!grid.Contains(column, row)) continue;
                var distance = Vector2D.Distance(impact.Position, ArenaTerrainGrid.CenterOf(column, row));
                if (distance >= radius) continue;
                var depth = (int)Math.Ceiling(power * (1 - distance / radius));
                if (depth <= 0) continue;
                var before = (Surface: grid.Surface(column, row), Material: grid.Material(column, row));
                var floor = protectedCells is { Length: > 0 } && protectedCells[row * grid.Columns + column]
                    ? RouteFloorMicrocells : ArenaTerrainGrid.BedrockMicrocells;
                if (grid.Excavate(column, row, depth, Math.Max(0, depth - StoneHardness), floor) == 0) continue;
                changes.Add(new ArenaTerrainChange(column, row, before.Surface, grid.Surface(column, row), before.Material, grid.Material(column, row)));
            }
        return changes;
    }

    /// <summary>Undo an applied impact exactly.</summary>
    public static void Revert(ArenaTerrainGrid grid, IReadOnlyList<ArenaTerrainChange> changes)
    {
        for (var index = changes.Count - 1; index >= 0; index--)
            grid.Restore(changes[index].Column, changes[index].Row, changes[index].OldSurface, changes[index].OldMaterial);
    }
}

/// <summary>Versioned save of player-made terrain damage for one arena visit, keyed by site so campaign history can adopt it later.</summary>
public sealed record ArenaTerrainRecord(int Version, string SiteKey, int Columns, int Rows,
    IReadOnlyList<long> AppliedImpactIds, IReadOnlyList<ArenaTerrainRecord.Column> Changed)
{
    public const int CurrentVersion = 1;

    public sealed record Column(int X, int Y, int Surface, ArenaTerrainMaterial Material);

    /// <summary>Record only the columns that differ from the freshly generated baseline.</summary>
    public static ArenaTerrainRecord Capture(string siteKey, ArenaTerrainGrid baseline, ArenaTerrainGrid current, IEnumerable<long> appliedImpactIds)
    {
        var changed = new List<Column>();
        for (var row = 0; row < current.Rows; row++)
            for (var column = 0; column < current.Columns; column++)
                if (current.Surface(column, row) != baseline.Surface(column, row) || current.Material(column, row) != baseline.Material(column, row))
                    changed.Add(new Column(column, row, current.Surface(column, row), current.Material(column, row)));
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
                column.Surface < ArenaTerrainGrid.BedrockMicrocells || !Enum.IsDefined(column.Material))
                throw new InvalidDataException("Terrain record contains an invalid column.");
        }
        foreach (var column in Changed) grid.Restore(column.X, column.Y, column.Surface, column.Material);
    }

    public string ToJson() => JsonSerializer.Serialize(this);

    public static ArenaTerrainRecord FromJson(string json) =>
        JsonSerializer.Deserialize<ArenaTerrainRecord>(json) ?? throw new InvalidDataException("Empty terrain record.");
}
