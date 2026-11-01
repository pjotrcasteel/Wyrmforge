using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WorldSiteFractureMutationStateTests
{
    private static WorldSiteStrataGrid Forest(int seed, double cellWidth = 1) =>
        new(new WorldSiteGeography(
            WorldSiteGeography.CurrentVersion, seed, "fire", $"fire:xyz3-forest-{seed}",
            "WetForest", new HuntPoint(.5, .5),
            new WorldSiteSurface(WorldSiteSurfaceId.Grass, .2, .06, .78, .1, .7),
            [], [], [])
        {
            GenerationProfile = new WorldSiteGenerationProfile(WorldSiteLandform.Wetland, WorldSiteLandmark.None),
            Landscape = new WorldSiteLandscapeRecipe("forest-fork", []),
        }, cellWidthMeters: cellWidth);

    private static WorldSiteCellKey Top(WorldSiteStrataGrid grid, int x, int y) =>
        new(x, y, grid.GetCell(x, y, int.MaxValue).SurfaceZ);

    [TestMethod]
    public void Xyz3_OneMicrocolumnOpensRealStoneWithoutRemovingItsWholeSoilBlock()
    {
        var grid = Forest(4201);
        var state = new WorldSiteStrataMutationState(grid);
        var top = Top(grid, 14, 24);
        var originalContact = state.GetMicrocellContact(top.X, top.Y, 3, 4);
        Assert.AreEqual(WorldSiteSurfaceId.Grass, originalContact.Material);
        Assert.AreEqual(7, originalContact.LocalZ);
        Assert.AreEqual(top, originalContact.Key);

        for (var z = 7; z >= 0; z--)
        {
            Assert.IsTrue(state.TryExcavateMicrocell(top, 3, 4, z));
            Assert.IsFalse(state.TryExcavateMicrocell(top, 3, 4, z),
                "Idempotent microcell removal must not increment revision twice.");
        }

        Assert.AreEqual(8L, state.Revision);
        Assert.AreEqual(1, state.FracturedCellCount);
        Assert.AreEqual(8, state.FindFracture(top)!.Mask.RemovedMicrocellCount);
        Assert.IsFalse(state.GetCell(top).IsEmpty, "Other local columns retain solid soil.");
        Assert.IsNull(state.FindDelta(top), "Partial fracturing does not create a legacy whole-block delta.");
        Assert.IsFalse(state.TryDamageCell(top, 1, 20),
            "Legacy whole-block integrity must not silently mix with partial fracture occupancy.");

        var exposedRock = state.GetMicrocellContact(top.X, top.Y, 3, 4);
        Assert.IsTrue(exposedRock.Solid);
        Assert.AreEqual(top with { Z = top.Z - 1 }, exposedRock.Key);
        Assert.AreEqual(7, exposedRock.LocalZ);
        Assert.AreEqual(WorldSiteSurfaceId.Rock, exposedRock.Material);
        Assert.AreEqual(originalContact.FloorHeightMeters - 1, exposedRock.FloorHeightMeters, 1e-9);

        var neighbor = state.GetMicrocellContact(top.X, top.Y, 4, 4);
        Assert.AreEqual(top, neighbor.Key, "A separate 12.5cm column remains grassy and occupied.");
        Assert.AreEqual(WorldSiteSurfaceId.Grass, neighbor.Material);
        Assert.AreEqual(top, state.GetGroundContact(top.X, top.Y).Key,
            "Old whole-block contact must stay conservative pending collision approval.");

        var json = JsonSerializer.Serialize(state.CaptureSave());
        var replay = WorldSiteStrataMutationState.Restore(grid,
            JsonSerializer.Deserialize<WorldSiteStrataMutationSave>(json)!);
        Assert.AreEqual(WorldSiteStrataMutationState.CurrentVersion, replay.CaptureSave().Version);
        Assert.AreEqual(json, JsonSerializer.Serialize(replay.CaptureSave()));
        Assert.AreEqual(exposedRock, replay.GetMicrocellContact(top.X, top.Y, 3, 4));
    }

    [TestMethod]
    public void Xyz3_SphericalImpactCrossesTrueOneMeterNeighborsAndReplaysExactlyOnce()
    {
        var grid = Forest(4202);
        var state = new WorldSiteStrataMutationState(grid);
        WorldSiteCellKey center = default;
        for (var y = 12; y < 30 && center == default; y++)
        for (var x = 12; x < 30; x++)
        {
            var current = Top(grid, x, y);
            var adjacent = Top(grid, x + 1, y);
            if (current.Z == adjacent.Z && grid.GetCell(x, y, current.Z).BodyMaterial == WorldSiteSurfaceId.Soil &&
                grid.GetCell(x + 1, y, adjacent.Z).BodyMaterial == WorldSiteSurfaceId.Soil)
            {
                center = current;
                break;
            }
        }

        Assert.AreNotEqual(default(WorldSiteCellKey), center, "This seeded wet forest must have adjacent 1m soil blocks.");
        var impact = new WorldSiteFractureImpact("xyz3-border-blast", center,
            LocalX: 7, LocalY: 4, LocalZ: 4, RadiusMicrocells: 2);
        var result = state.ApplyFractureImpact(impact);
        Assert.IsFalse(result.Duplicate);
        Assert.IsTrue(result.Changes.Count > 1);
        Assert.IsTrue(result.Changes.Any(change => change.Key == center));
        Assert.IsTrue(result.Changes.Any(change => change.Key == (center with { X = center.X + 1 })),
            "A 12.5cm sphere must cross the 1m block boundary, not stop at the 32px tile seam.");
        Assert.AreEqual(result.Changes.Count, result.RevisionAfter);
        Assert.IsTrue(result.Changes.All(change => change.BodyMaterial == WorldSiteSurfaceId.Soil));
        Assert.AreEqual(2, state.FracturedCellCount);
        Assert.AreEqual(0, state.ChangedCellCount);
        Assert.IsTrue(result.Changes.Zip(result.Changes.Skip(1))
            .All(pair => pair.First.Key.Z > pair.Second.Key.Z ||
                pair.First.Key.Z == pair.Second.Key.Z),
            "Microcell change events must follow deterministic descending world Z.");

        var beforeDuplicate = JsonSerializer.Serialize(state.CaptureSave());
        var duplicate = state.ApplyFractureImpact(impact);
        Assert.IsTrue(duplicate.Duplicate);
        Assert.AreEqual(0, duplicate.Changes.Count);
        Assert.AreEqual(beforeDuplicate, JsonSerializer.Serialize(state.CaptureSave()));
        var restored = WorldSiteStrataMutationState.Restore(grid,
            JsonSerializer.Deserialize<WorldSiteStrataMutationSave>(beforeDuplicate)!);
        Assert.IsTrue(restored.ApplyFractureImpact(impact).Duplicate);
        Assert.AreEqual(beforeDuplicate, JsonSerializer.Serialize(restored.CaptureSave()));
        var legacySameId = restored.ApplySurfaceImpact(new WorldSiteStrataImpact(
            impact.ImpactId, center.X, center.Y, 0, 30, 20, 80, 40));
        Assert.IsTrue(legacySameId.Duplicate, "One common C# registry prevents cross-format replay damage.");
    }

    [TestMethod]
    public void Xyz3_FirstBlastShieldsBuriedRockSecondBlastCanHitTrulyExposedRock()
    {
        var grid = Forest(4203);
        var state = new WorldSiteStrataMutationState(grid);
        var soil = Top(grid, 14, 24);
        var rock = soil with { Z = soil.Z - 1 };
        var first = state.ApplyFractureImpact(new WorldSiteFractureImpact(
            "soil-first", soil, 4, 4, 0, RadiusMicrocells: 2));
        Assert.IsTrue(first.Changes.Count > 0);
        Assert.IsFalse(first.Changes.Any(change => change.Key.Z < soil.Z),
            "A blast may not remove covered rock immediately after removing its own soil shield.");
        Assert.IsNull(state.FindFracture(rock));

        // Clear only this microcolumn, leaving the surrounding 1m dirt block intact.
        for (var z = 0; z < 8; z++)
        {
            state.TryExcavateMicrocell(soil, 4, 4, z);
        }

        Assert.AreEqual(rock, state.GetMicrocellContact(soil.X, soil.Y, 4, 4).Key);
        var second = state.ApplyFractureImpact(new WorldSiteFractureImpact(
            "rock-second", rock, 4, 4, 7, RadiusMicrocells: 0));
        Assert.AreEqual(1, second.Changes.Count);
        Assert.AreEqual(rock, second.Changes[0].Key);
        Assert.AreEqual(WorldSiteSurfaceId.Rock, second.Changes[0].BodyMaterial);
        Assert.IsTrue(state.FindFracture(rock)!.Mask.IsRemoved(4, 4, 7));
        var beneath = state.GetMicrocellContact(soil.X, soil.Y, 4, 4);
        Assert.AreEqual(rock, beneath.Key);
        Assert.AreEqual(6, beneath.LocalZ);
    }

    [TestMethod]
    public void Xyz3_FullyExcavatedMaskExposesWholeRockBlockAndSavesOnlyOneMask()
    {
        var grid = Forest(4204);
        var state = new WorldSiteStrataMutationState(grid);
        var soil = Top(grid, 14, 24);
        for (var z = 0; z < 8; z++)
        for (var y = 0; y < 8; y++)
        for (var x = 0; x < 8; x++)
        {
            Assert.IsTrue(state.TryExcavateMicrocell(soil, x, y, z));
        }

        Assert.IsTrue(state.FindFracture(soil)!.Mask.IsFullyExcavated);
        Assert.IsTrue(state.GetCell(soil).IsEmpty);
        Assert.AreEqual(soil with { Z = soil.Z - 1 }, state.GetExposedSurfaceCell(soil.X, soil.Y).Key);
        Assert.AreEqual(WorldSiteSurfaceId.Rock, state.GetGroundContact(soil.X, soil.Y).Material);
        Assert.AreEqual(512L, state.Revision);
        Assert.AreEqual(1, state.CaptureSave().Fractures.Count);
        Assert.AreEqual(0, state.CaptureSave().Changes.Count);
        var replay = WorldSiteStrataMutationState.Restore(grid,
            JsonSerializer.Deserialize<WorldSiteStrataMutationSave>(
                JsonSerializer.Serialize(state.CaptureSave()))!);
        Assert.IsTrue(replay.GetCell(soil).IsEmpty);
        Assert.AreEqual(state.GetGroundContact(soil.X, soil.Y),
            replay.GetGroundContact(soil.X, soil.Y));
    }

    [TestMethod]
    public void Xyz3_RejectsCorruptFracturesAndPreservesLegacySaveSchemas()
    {
        var grid = Forest(4205);
        var state = new WorldSiteStrataMutationState(grid);
        var soil = Top(grid, 14, 24);
        Assert.IsTrue(state.TryExcavateMicrocell(soil, 1, 2, 3));
        var save = state.CaptureSave();
        Assert.ThrowsExactly<ArgumentException>(() => WorldSiteStrataMutationState.Restore(grid,
            save with { Version = 3 }));
        Assert.ThrowsExactly<ArgumentException>(() => WorldSiteStrataMutationState.Restore(grid,
            save with { Fractures = [save.Fractures[0], save.Fractures[0]] }));
        Assert.ThrowsExactly<ArgumentException>(() => WorldSiteStrataMutationState.Restore(grid,
            save with { Fractures = [save.Fractures[0] with { Mask = default }] }));
        Assert.ThrowsExactly<ArgumentException>(() => WorldSiteStrataMutationState.Restore(grid,
            save with { Fractures = [save.Fractures[0] with { Revision = 2 }] }));
        Assert.ThrowsExactly<ArgumentException>(() => WorldSiteStrataMutationState.Restore(grid,
            save with { Fractures = [save.Fractures[0] with { Key = soil with { Z = soil.Z + 1 } }] }));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
            state.TryExcavateMicrocell(soil, 8, 0, 0));
        Assert.ThrowsExactly<InvalidOperationException>(() =>
            new WorldSiteStrataMutationState(Forest(4205,
                WorldSiteStrataGrid.PreviewCellWidthMeters)).TryExcavateMicrocell(soil, 0, 0, 0));

        var legacy = new WorldSiteStrataMutationState(grid);
        Assert.IsTrue(legacy.TryDamageCell(soil, 1, 20));
        foreach (var oldVersion in new[] { 2, 3 })
        {
            var restored = WorldSiteStrataMutationState.Restore(grid,
                legacy.CaptureSave() with { Version = oldVersion });
            Assert.AreEqual(0, restored.FracturedCellCount);
            Assert.AreEqual(WorldSiteStrataMutationState.CurrentVersion, restored.CaptureSave().Version);
            Assert.AreEqual(19, restored.FindDelta(soil)!.RemainingIntegrity);
        }
    }
}
