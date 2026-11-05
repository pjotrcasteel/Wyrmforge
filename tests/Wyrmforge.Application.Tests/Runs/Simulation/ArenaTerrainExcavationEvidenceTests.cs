using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

/// <summary>
/// Hunt 1.0 H6 evidence. Digs three real sites of a generated arena stage by stage with the production excavation rule (a patch of grass and soil
/// with ordinary and Meteor Heart power, and a cliff face from the side) and, when WYRMFORGE_EVIDENCE_DIR is set, writes every stage as the
/// terrain frame the browser receives, so the client painter can be photographed on authoritative data.
/// </summary>
[TestClass]
public sealed class ArenaTerrainExcavationEvidenceTests
{
    private const int Columns = 32, Rows = 60;

    private sealed record Stage(string Site, int Hits, int StoneMicrocolumns, int Revision, object Frame);

    [TestMethod]
    public void RepeatedFireballsDigGrassThenSoilThenRock_AndStageFramesCanBeExported()
    {
        var recipe = ArenaTerrainGenerator.Generate(5, 0.1, Columns, Rows, (16, 52), (16, 6));
        var grid = recipe.Grid;
        var stages = new List<Stage>();
        long id = 1;

        var patch = FindOpenSoil(grid, recipe.ProtectedCells);
        var centre = ArenaTerrainGrid.CenterOf(patch.Column, patch.Row);
        var dug = 0;
        foreach (var target in new[] { 1, 4, 9, 16 })
        {
            for (; dug < target; dug++) ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(id++, centre, 1), recipe.ProtectedCells);
            stages.Add(new("soil-ordinary", target, StoneMicros(grid, patch), grid.Revision, grid.ToFrame(-1)));
        }
        Assert.AreEqual(0, stages[0].StoneMicrocolumns, "one hit only scratches the grass");
        Assert.IsGreaterThan(0, stages[3].StoneMicrocolumns, "sixteen ordinary hits at one spot dig through the metre of soil to the rock");

        var meteor = FindOpenSoil(grid, recipe.ProtectedCells, startColumn: patch.Column + 4, startRow: patch.Row - 3);
        var meteorCentre = ArenaTerrainGrid.CenterOf(meteor.Column, meteor.Row);
        dug = 0;
        foreach (var target in new[] { 1, 3, 6 })
        {
            for (; dug < target; dug++) ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(id++, meteorCentre, 3), recipe.ProtectedCells);
            stages.Add(new("soil-meteor", target, StoneMicros(grid, meteor), grid.Revision, grid.ToFrame(-1)));
        }

        var face = FindCliffFace(grid);
        if (face is { } found)
        {
            var contact = new Vector2D((found.Column + .5) * ArenaTerrainGrid.CellUnits, (found.Row + 1) * ArenaTerrainGrid.CellUnits - 1);
            dug = 0;
            foreach (var target in new[] { 1, 4, 10 })
            {
                for (; dug < target; dug++)
                    ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(id++, contact, 2, new Vector2D(0, -1), 10), recipe.ProtectedCells);
                stages.Add(new("cliff-face", target, 0, grid.Revision, grid.ToFrame(-1)));
            }
        }

        var directory = Environment.GetEnvironmentVariable("WYRMFORGE_EVIDENCE_DIR");
        if (string.IsNullOrWhiteSpace(directory)) return;
        Directory.CreateDirectory(directory);
        var sites = new
        {
            soil = new { patch.Column, patch.Row }, meteor = new { meteor.Column, meteor.Row },
            cliff = face is { } f ? new { f.Column, f.Row } : null,
        };
        File.WriteAllText(Path.Combine(directory, "dig-stages.json"),
            JsonSerializer.Serialize(new { sites, stages }, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
    }

    /// <summary>Microcolumns around a dug site (a 5 x 5 block window, all soil before the digging) that now show rock.</summary>
    private static int StoneMicros(ArenaTerrainGrid grid, (int Column, int Row) site)
    {
        var count = 0;
        for (var row = site.Row - 2; row <= site.Row + 2; row++)
            for (var column = site.Column - 2; column <= site.Column + 2; column++)
                for (var my = 0; my < ArenaTerrainGrid.MicroPerColumn; my++)
                    for (var mx = 0; mx < ArenaTerrainGrid.MicroPerColumn; mx++)
                        if (grid.MicroMaterial(column, row, mx, my) == ArenaTerrainMaterial.Stone) count++;
        return count;
    }

    private static (int Column, int Row) FindOpenSoil(ArenaTerrainGrid grid, bool[] protectedCells, int startColumn = 21, int startRow = 33)
    {
        for (var radius = 0; radius < 20; radius++)
            for (var dy = -radius; dy <= radius; dy++)
                for (var dx = -radius; dx <= radius; dx++)
                {
                    var (column, row) = (startColumn + dx, startRow + dy);
                    if (column < 3 || row < 3 || column >= Columns - 3 || row >= Rows - 3 || protectedCells[row * Columns + column]) continue;
                    var clear = true;
                    for (var ox = -2; ox <= 2 && clear; ox++)
                        for (var oy = -2; oy <= 2 && clear; oy++)
                            clear = grid.Material(column + ox, row + oy) == ArenaTerrainMaterial.Soil && grid.Surface(column + ox, row + oy) == 0 && !grid.IsSubdivided(column + ox, row + oy)
                                && !protectedCells[(row + oy) * Columns + column + ox];
                    if (clear) return (column, row);
                }
        throw new AssertInconclusiveException("no open soil patch");
    }

    private static (int Column, int Row)? FindCliffFace(ArenaTerrainGrid grid)
    {
        for (var row = 4; row < Rows - 4; row++)
            for (var column = 3; column < Columns - 3; column++)
            {
                if (grid.Material(column, row) != ArenaTerrainMaterial.Stone || grid.Surface(column, row) < 12 || grid.IsSubdivided(column, row)) continue;
                if (grid.Material(column, row + 1) == ArenaTerrainMaterial.Soil && grid.Surface(column, row + 1) == 0) return (column, row);
            }
        return null;
    }
}
