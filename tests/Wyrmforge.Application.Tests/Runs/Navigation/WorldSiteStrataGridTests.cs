using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WorldSiteStrataGridTests
{
    // An explicit Wet Forest C# geography fixture: the Fire Hunt generator does not
    // guarantee a Forest Fork/Trail node for every seed.
    private static WorldSiteGeography Forest(int seed) =>
        new(
            WorldSiteGeography.CurrentVersion,
            seed,
            "fire",
            $"fire:xyz0-forest-{seed}",
            "WetForest",
            new HuntPoint(.5, .5),
            new WorldSiteSurface(WorldSiteSurfaceId.Grass, .2, .06, .78, .1, .7),
            [],
            [],
            [])
        {
            GenerationProfile = new WorldSiteGenerationProfile(WorldSiteLandform.Wetland, WorldSiteLandmark.None),
            Landscape = new WorldSiteLandscapeRecipe("forest-fork", []),
        };

    [TestMethod]
    public void Xyz0_ReadonlyRenderMatrixContainsExactlyTheAuthoritativeTopCells()
    {
        // This test intentionally preserves the historical 6.4m *diagnostic* image
        // until the 1m authoritative grid has a viewport-cropped compositor.
        var grid = new WorldSiteStrataGrid(Forest(1224),
            cellWidthMeters: WorldSiteStrataGrid.PreviewCellWidthMeters);
        var rendered = WorldSiteStrataRenderSnapshot.FromGrid(grid);
        Assert.AreEqual(grid.SiteId, rendered.SiteId);
        Assert.AreEqual(grid.WorldSeed, rendered.WorldSeed);
        Assert.AreEqual(32, rendered.TilePixels);
        Assert.AreEqual(30, rendered.Columns);
        Assert.AreEqual(49, rendered.Rows);
        Assert.AreEqual(grid.Columns * grid.Rows, rendered.SurfaceMaterialIds.Length);
        Assert.AreEqual(grid.Columns * grid.Rows, rendered.BodyMaterialIds.Length);
        Assert.AreEqual(grid.Columns * grid.Rows, rendered.SurfaceZ.Length);

        foreach (var (x, y) in new[] { (0, 0), (14, 24), (29, 48) })
        {
            var index = y * grid.Columns + x;
            var top = grid.GetCell(x, y, rendered.SurfaceZ[index]);
            Assert.AreEqual((int)top.SurfaceFinish!.Value, rendered.SurfaceMaterialIds[index]);
            Assert.AreEqual(top.MaterialId, rendered.BodyMaterialIds[index]);
            Assert.AreEqual(top.SurfaceZ, rendered.SurfaceZ[index]);
            Assert.AreEqual(WorldSiteSurfaceId.Rock,
                grid.GetCell(x, y, rendered.SurfaceZ[index] - 1).BodyMaterial,
                "A drawn top face must retain the C#-owned stone layer underneath.");
        }
    }

    [TestMethod]
    public void Xyz0_Native32PxGridHasIndependentPhysicalAndVerticalUnits()
    {
        var grid = new WorldSiteStrataGrid(Forest(1204),
            cellWidthMeters: WorldSiteStrataGrid.PreviewCellWidthMeters);
        Assert.AreEqual(32, WorldSiteStrataGrid.NativeSourceTilePixels);
        Assert.AreEqual(950, WorldSiteStrataGrid.PreviewSiteWidthPixels);
        Assert.AreEqual(1550, WorldSiteStrataGrid.PreviewSiteHeightPixels);
        Assert.AreEqual(6.4, grid.CellWidthMeters, .000001);
        Assert.AreEqual(1, grid.StratumHeightMeters, .000001);
        Assert.AreEqual(30, grid.Columns);
        Assert.AreEqual(49, grid.Rows);
        Assert.IsTrue(grid.GetCell(-1, 0, 0).IsEmpty);
        Assert.IsTrue(grid.GetCell(0, -1, 0).IsEmpty);
        Assert.IsTrue(grid.GetCell(grid.Columns, 0, 0).IsEmpty);
        Assert.IsTrue(grid.GetCell(0, grid.Rows, 0).IsEmpty);
        Assert.IsFalse(grid.GetCell(grid.Columns - 1, grid.Rows - 1, -4).IsEmpty,
            "A bounded partial edge tile must still sample the C# site and underlying stone.");
    }

    [TestMethod]
    public void Xyz0_OwnerApprovedOneMetreCubesAreIndependentOfTheLegacyPreviewScale()
    {
        var grid = new WorldSiteStrataGrid(Forest(1204));
        Assert.AreEqual(1d, WorldSiteStrataGrid.BlockEdgeMeters);
        Assert.AreEqual(1d, grid.CellWidthMeters);
        Assert.AreEqual(1d, grid.StratumHeightMeters);
        Assert.AreEqual(190, grid.Columns);
        Assert.AreEqual(310, grid.Rows);
        Assert.AreEqual(32, WorldSiteStrataGrid.NativeSourceTilePixels);
        Assert.AreEqual(6.4d, WorldSiteStrataGrid.PreviewCellWidthMeters, 1e-9);

        var top = grid.GetCell(100, 150, int.MaxValue);
        var rock = grid.GetCell(100, 150, top.SurfaceZ - 1);
        Assert.IsFalse(top.IsEmpty);
        Assert.AreEqual(WorldSiteSurfaceId.Rock, rock.BodyMaterial!.Value);
        Assert.AreEqual(new WorldSiteCellKey(100, 150, top.SurfaceZ),
            grid.GetCell(100, 150, top.SurfaceZ).Key);
    }

    [TestMethod]
    public void Xyz0_CSharpSurfaceCellCoversSoilOverStone_WithoutInventingAtlasIds()
    {
        var site = Forest(1204);
        var grid = new WorldSiteStrataGrid(site);
        var x = grid.Columns / 2;
        var y = grid.Rows / 2;
        var point = new HuntPoint(
            Math.Min((x + .5) * grid.CellWidthMeters / WorldSiteElevationField.SiteWidthMeters, 1),
            Math.Min((y + .5) * grid.CellWidthMeters / WorldSiteElevationField.SiteLengthMeters, 1));
        var authoritative = WorldSiteElevationField.Sample(site, point);
        var z = (int)Math.Floor(authoritative.HeightMeters / grid.StratumHeightMeters);

        var top = grid.GetCell(x, y, z);
        var stone = grid.GetCell(x, y, z - 1);
        var air = grid.GetCell(x, y, z + 1);
        Assert.IsFalse(top.IsEmpty);
        Assert.IsTrue(top.BodyMaterial.HasValue);
        Assert.AreEqual(authoritative.Material, top.SurfaceFinish!.Value);
        Assert.AreEqual(authoritative.HeightMeters, top.SurfaceHeightMeters, 1e-12);
        Assert.AreEqual(z, top.SurfaceZ);
        Assert.AreEqual((int)top.BodyMaterial.Value, top.MaterialId);
        Assert.IsFalse(stone.IsEmpty);
        Assert.AreEqual(WorldSiteSurfaceId.Rock, stone.BodyMaterial!.Value,
            "The provisional geology explicitly resolves stone under the surface, not a painted cliff.");
        Assert.IsNull(stone.SurfaceFinish, "A buried rock does not pretend to be an exposed visual tile.");
        Assert.AreEqual((int)WorldSiteSurfaceId.Rock, stone.MaterialId);
        Assert.IsTrue(air.IsEmpty);
        Assert.AreEqual(-1, air.MaterialId);
        Assert.IsFalse(air.Solid);
        Assert.AreEqual(z, air.SurfaceZ);
    }

    [TestMethod]
    public void Xyz0_SameWorldSeedAndCellAddressGiveIdenticalGeologyWithoutStateMutation()
    {
        foreach (var seed in new[] { 0, 17, 1204, 87122 })
        {
            var site = Forest(seed);
            var copy = Forest(seed);
            var before = JsonSerializer.Serialize(site);
            var first = new WorldSiteStrataGrid(site);
            var replay = new WorldSiteStrataGrid(copy);
            foreach (var (x, y) in new[]
            {
                (0, 0), (first.Columns / 2, first.Rows / 2), (first.Columns - 1, first.Rows - 1),
            })
            {
                var surface = first.GetCell(x, y, 9999);
                for (var z = surface.SurfaceZ - 2; z <= surface.SurfaceZ + 1; z++)
                    Assert.AreEqual(first.GetCell(x, y, z), replay.GetCell(x, y, z),
                        $"Site {site.SiteId}, seed {seed}, ({x},{y},{z}) must replay exactly.");
            }
            Assert.AreEqual(before, JsonSerializer.Serialize(site),
                "The read-only XYZ projection must never mutate the original AR3 geography.");
        }
    }
}
