using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WorldSiteStrataMutationStateTests
{
    private static WorldSiteGeography Forest(int seed) =>
        new(
            WorldSiteGeography.CurrentVersion,
            seed,
            "fire",
            $"fire:xyz1-forest-{seed}",
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

    private static WorldSiteCellKey TopKey(WorldSiteStrataGrid grid, int x, int y)
    {
        var surface = grid.GetCell(x, y, int.MaxValue);
        return new WorldSiteCellKey(x, y, surface.SurfaceZ);
    }

    [TestMethod]
    public void Xyz2_OneFiveByFiveRadialImpactRemovesFiveSoilCellsButPreservesDamagedNeighborsAndStone()
    {
        var grid = new WorldSiteStrataGrid(Forest(4102));
        var state = new WorldSiteStrataMutationState(grid);
        var center = TopKey(grid, 14, 24);
        var diagonal = TopKey(grid, 15, 25);
        var edge = TopKey(grid, 16, 24);
        var untouchedCorner = TopKey(grid, 16, 26);
        var buriedStone = center with { Z = center.Z - 1 };

        var before = WorldSiteStrataRenderSnapshot.FromGrid(grid);
        var impact = new WorldSiteStrataImpact("fireball-demo-001", center.X, center.Y,
            RadiusCells: 2, PeakDamage: 30, SoilIntegrity: 20, RockIntegrity: 80, OtherIntegrity: 40);
        var result = state.ApplySurfaceImpact(impact);

        Assert.AreEqual(13, result.Changes.Count, "Radius 2 contains 13 physical XY cell centers.");
        Assert.AreEqual(5, result.Changes.Count(change => change.Delta.Kind == WorldSiteCellMutationKind.Removed));
        Assert.AreEqual(8, result.Changes.Count(change => change.Delta.Kind == WorldSiteCellMutationKind.Damaged));
        Assert.AreEqual(0L, result.RevisionBefore);
        Assert.AreEqual(13L, result.RevisionAfter);
        Assert.AreEqual(WorldSiteStrataImpactResult.CurrentVersion, result.Version);
        Assert.AreEqual(13L, state.Revision);
        Assert.IsTrue(state.GetCell(center).IsEmpty);
        Assert.AreEqual(WorldSiteSurfaceId.Rock, state.GetExposedSurfaceCell(center.X, center.Y).SurfaceFinish!.Value);
        Assert.AreEqual(WorldSiteSurfaceId.Rock, state.GetCell(buriedStone).BodyMaterial!.Value,
            "One Fireball impact cannot drill through protected soil and stone in the same column.");
        Assert.IsNull(state.FindDelta(buriedStone), "The first blast did not damage covered stone.");
        Assert.AreEqual(2, state.FindDelta(diagonal)!.RemainingIntegrity,
            "A diagonal neighbor gets a weaker 18-point hit and keeps 2 integrity.");
        Assert.AreEqual(14, state.FindDelta(edge)!.RemainingIntegrity,
            "At radius 2 the outer edge receives only 6 points.");
        Assert.IsNull(state.FindDelta(untouchedCorner), "The 5x5 square corners lie outside radius 2.");

        var projected = WorldSiteStrataRenderSnapshot.FromMutations(state);
        var index = center.Y * grid.Columns + center.X;
        Assert.AreEqual((int)WorldSiteSurfaceId.Grass, before.SurfaceMaterialIds[index]);
        Assert.AreEqual((int)WorldSiteSurfaceId.Rock, projected.SurfaceMaterialIds[index]);
        Assert.AreEqual((int)WorldSiteSurfaceId.Rock, projected.BodyMaterialIds[index]);
        Assert.AreEqual(before.SurfaceZ[index] - 1, projected.SurfaceZ[index]);
        Assert.AreEqual(result.RevisionAfter, projected.Revision,
            "The pixel cache must invalidate when the authoritative exposed material changes.");
        Assert.AreEqual((int)WorldSiteSurfaceId.Grass,
            projected.SurfaceMaterialIds[diagonal.Y * grid.Columns + diagonal.X],
            "A damaged but surviving cell keeps its original ground material.");

        var saved = JsonSerializer.Deserialize<WorldSiteStrataMutationSave>(
            JsonSerializer.Serialize(state.CaptureSave()))!;
        var replay = WorldSiteStrataMutationState.Restore(new WorldSiteStrataGrid(Forest(4102)), saved);
        Assert.AreEqual(JsonSerializer.Serialize(projected),
            JsonSerializer.Serialize(WorldSiteStrataRenderSnapshot.FromMutations(replay)));
    }

    [TestMethod]
    public void Xyz2_AreaEventHasDeterministicRowMajorOrderAndSeparateRockResistance()
    {
        var grid = new WorldSiteStrataGrid(Forest(851));
        var first = new WorldSiteStrataMutationState(grid);
        var second = new WorldSiteStrataMutationState(new WorldSiteStrataGrid(Forest(851)));
        var request = new WorldSiteStrataImpact("scripted-impact", 14, 24,
            RadiusCells: 2, PeakDamage: 30, SoilIntegrity: 20, RockIntegrity: 80, OtherIntegrity: 40);
        var a = first.ApplySurfaceImpact(request);
        var b = second.ApplySurfaceImpact(request);
        Assert.AreEqual(JsonSerializer.Serialize(a), JsonSerializer.Serialize(b));
        Assert.AreEqual(JsonSerializer.Serialize(first.CaptureSave()), JsonSerializer.Serialize(second.CaptureSave()));
        Assert.AreEqual("scripted-impact", a.ImpactId);
        CollectionAssert.AreEqual(Enumerable.Range(1, 13).Select(n => (long)n).ToArray(),
            a.Changes.Select(change => change.Delta.Revision).ToArray());
        Assert.IsTrue(a.Changes.Zip(a.Changes.Skip(1))
            .All(pair => pair.First.Key.Y < pair.Second.Key.Y ||
                (pair.First.Key.Y == pair.Second.Key.Y && pair.First.Key.X < pair.Second.Key.X)),
            "Future G/FXP/VFX adapters must see replayable row-major changed-cell events.");

        var center = first.GetExposedSurfaceCell(14, 24);
        Assert.AreEqual(WorldSiteSurfaceId.Rock, center.SurfaceFinish!.Value);
        var stoneOnly = first.ApplySurfaceImpact(request with
        {
            ImpactId = "second-impact",
            RadiusCells = 0,
            PeakDamage = 10,
        });
        Assert.AreEqual(1, stoneOnly.Changes.Count);
        Assert.AreEqual(center.Key, stoneOnly.Changes[0].Key);
        Assert.AreEqual(70, first.FindDelta(center.Key)!.RemainingIntegrity,
            "Exposed stone is tougher than the removed soil in this explicit C# test profile.");
        Assert.AreEqual(WorldSiteCellMutationKind.Damaged, stoneOnly.Changes[0].Delta.Kind);
        Assert.AreEqual(WorldSiteSurfaceId.Rock, stoneOnly.Changes[0].ExposedMaterial!.Value);
    }

    [TestMethod]
    public void Xyz2_BoundedAreaRejectsInvalidInputAndClipsPhysicalWorldEdgesWithoutWraparound()
    {
        var state = new WorldSiteStrataMutationState(new WorldSiteStrataGrid(Forest(157)));
        var valid = new WorldSiteStrataImpact("bounded", 0, 0,
            RadiusCells: 2, PeakDamage: 20, SoilIntegrity: 20, RockIntegrity: 80, OtherIntegrity: 40);
        Assert.ThrowsExactly<ArgumentException>(() =>
            state.ApplySurfaceImpact(valid with { ImpactId = " " }));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
            state.ApplySurfaceImpact(valid with { RadiusCells = 17 }));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
            state.ApplySurfaceImpact(valid with { PeakDamage = 0 }));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
            state.ApplySurfaceImpact(valid with { RockIntegrity = 0 }));
        Assert.AreEqual(0L, state.Revision);

        var corner = state.ApplySurfaceImpact(valid);
        Assert.AreEqual(6, corner.Changes.Count, "Only in-bounds cells of the circular 5x5 footprint mutate.");
        Assert.IsTrue(corner.Changes.All(change => change.Key.X >= 0 && change.Key.Y >= 0));
        var farOutside = state.ApplySurfaceImpact(valid with
        {
            ImpactId = "outside",
            CenterX = int.MaxValue,
            CenterY = int.MinValue,
        });
        Assert.AreEqual(0, farOutside.Changes.Count);
        Assert.AreEqual(corner.RevisionAfter, farOutside.RevisionAfter);
        Assert.AreEqual(corner.RevisionAfter, state.Revision);
    }

    [TestMethod]
    public void Xyz1_DirtDamageAndRemovalExposeTrueStoneFromTheExistingCSharpBase()
    {
        var site = Forest(1204);
        var beforeGeography = JsonSerializer.Serialize(site);
        var grid = new WorldSiteStrataGrid(site);
        var state = new WorldSiteStrataMutationState(grid);
        var dirt = TopKey(grid, grid.Columns / 2, grid.Rows / 2);
        var stone = dirt with { Z = dirt.Z - 1 };
        Assert.AreEqual(WorldSiteSurfaceId.Soil, state.GetCell(dirt).BodyMaterial!.Value);
        Assert.AreEqual(WorldSiteSurfaceId.Rock, state.GetCell(stone).BodyMaterial!.Value);
        Assert.IsNull(state.GetCell(stone).SurfaceFinish, "Buried rock has no exposed top tile.");

        Assert.IsTrue(state.TryDamageCell(dirt, damage: 9, initialIntegrity: 20));
        Assert.AreEqual(WorldSiteCellMutationKind.Damaged, state.FindDelta(dirt)!.Kind);
        Assert.AreEqual(11, state.FindDelta(dirt)!.RemainingIntegrity);
        Assert.AreEqual(WorldSiteSurfaceId.Soil, state.GetCell(dirt).BodyMaterial!.Value);
        Assert.IsNull(state.GetCell(stone).SurfaceFinish);

        Assert.IsTrue(state.TryDamageCell(dirt, damage: 11, initialIntegrity: 20));
        Assert.IsTrue(state.GetCell(dirt).IsEmpty);
        Assert.AreEqual(WorldSiteCellMutationKind.Removed, state.FindDelta(dirt)!.Kind);
        Assert.AreEqual(0, state.FindDelta(dirt)!.RemainingIntegrity);
        Assert.AreEqual(WorldSiteSurfaceId.Rock, state.GetCell(stone).SurfaceFinish!.Value,
            "Removed dirt must reveal the real rock directly underneath, not a JS painted crater.");
        Assert.IsFalse(state.TryDamageCell(dirt, damage: 100, initialIntegrity: 20),
            "A removed physical block must not pay out a second impact.");
        Assert.AreEqual(2L, state.Revision);
        Assert.AreEqual(1, state.ChangedCellCount);
        Assert.AreEqual(beforeGeography, JsonSerializer.Serialize(site),
            "XYZ1 mutation state must not rewrite AR3 geology, routes or physical grade.");
    }

    [TestMethod]
    public void Xyz1_ExposedSurfaceFollowsRemovedStackAndDeterministicSaveRestore()
    {
        var grid = new WorldSiteStrataGrid(Forest(1204));
        var state = new WorldSiteStrataMutationState(grid);
        var top = TopKey(grid, grid.Columns / 2, grid.Rows / 2);
        var firstRock = top with { Z = top.Z - 1 };
        var secondRock = top with { Z = top.Z - 2 };

        Assert.AreEqual(top, state.GetExposedSurfaceCell(top.X, top.Y).Key);
        Assert.IsTrue(state.TryDamageCell(top, damage: 12, initialIntegrity: 12));
        Assert.AreEqual(firstRock, state.GetExposedSurfaceCell(top.X, top.Y).Key);
        Assert.AreEqual(WorldSiteSurfaceId.Rock,
            state.GetExposedSurfaceCell(top.X, top.Y).SurfaceFinish!.Value);
        Assert.IsTrue(state.TryDamageCell(firstRock, damage: 50, initialIntegrity: 50));
        Assert.AreEqual(secondRock, state.GetExposedSurfaceCell(top.X, top.Y).Key);
        Assert.AreEqual(WorldSiteSurfaceId.Rock,
            state.GetExposedSurfaceCell(top.X, top.Y).SurfaceFinish!.Value);
        Assert.IsTrue(state.GetExposedSurfaceCell(-1, 0).IsEmpty);

        var save = JsonSerializer.Deserialize<WorldSiteStrataMutationSave>(
            JsonSerializer.Serialize(state.CaptureSave()))!;
        var restored = WorldSiteStrataMutationState.Restore(new WorldSiteStrataGrid(Forest(1204)), save);
        Assert.AreEqual(state.GetExposedSurfaceCell(top.X, top.Y),
            restored.GetExposedSurfaceCell(top.X, top.Y));
        Assert.AreEqual(state.GetCell(firstRock), restored.GetCell(firstRock));
    }

    [TestMethod]
    public void Xyz1_SeedAndSiteScopedSparseDeltasRoundTripThroughJsonWithoutSavingTheWholeWorld()
    {
        var originalSite = Forest(47);
        var original = new WorldSiteStrataMutationState(new WorldSiteStrataGrid(originalSite));
        var first = TopKey(new WorldSiteStrataGrid(originalSite), 6, 8);
        var second = TopKey(new WorldSiteStrataGrid(originalSite), 7, 8);
        Assert.IsTrue(original.TryDamageCell(first, 4, 10));
        Assert.IsTrue(original.TryDamageCell(second, 10, 10));
        Assert.IsTrue(original.TryDamageCell(first, 6, 10));
        var save = original.CaptureSave();
        Assert.AreEqual(2, save.Changes.Count, "Only the two changed blocks may be serialized.");
        Assert.AreEqual(3L, save.Revision);
        Assert.AreEqual(2L, save.Changes[0].Revision);
        Assert.AreEqual(3L, save.Changes[1].Revision);
        Assert.IsTrue(save.Changes.All(delta => delta.Kind == WorldSiteCellMutationKind.Removed));

        var json = JsonSerializer.Serialize(save);
        var loaded = JsonSerializer.Deserialize<WorldSiteStrataMutationSave>(json)!;
        var restored = WorldSiteStrataMutationState.Restore(new WorldSiteStrataGrid(Forest(47)), loaded);
        Assert.AreEqual(json, JsonSerializer.Serialize(restored.CaptureSave()));
        Assert.AreEqual(original.GetCell(first), restored.GetCell(first));
        Assert.AreEqual(original.GetCell(second), restored.GetCell(second));
        Assert.AreEqual(original.GetCell(first with { Z = first.Z - 1 }),
            restored.GetCell(first with { Z = first.Z - 1 }));

        Assert.IsTrue(restored.TryDamageCell(first with { Z = first.Z - 1 }, 1, 5));
        Assert.AreEqual(4L, restored.Revision);
        Assert.AreEqual(3, restored.ChangedCellCount);
    }

    [TestMethod]
    public void Xyz1_RejectsAirForeignWorldAndCorruptOrDuplicateChanges()
    {
        var grid = new WorldSiteStrataGrid(Forest(17));
        var state = new WorldSiteStrataMutationState(grid);
        var top = TopKey(grid, 4, 5);
        Assert.IsFalse(state.TryDamageCell(top with { Z = top.Z + 1 }, 10, 10));
        Assert.IsFalse(state.TryDamageCell(new WorldSiteCellKey(-1, 5, top.Z), 10, 10));
        Assert.IsFalse(state.TryDamageCell(top, 0, 10));
        Assert.AreEqual(0, state.ChangedCellCount);
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => state.TryDamageCell(top, 1, 0));
        Assert.IsTrue(state.TryDamageCell(top, 3, 10));
        var save = state.CaptureSave();

        Assert.ThrowsExactly<ArgumentException>(() =>
            WorldSiteStrataMutationState.Restore(new WorldSiteStrataGrid(Forest(18)), save));
        Assert.ThrowsExactly<ArgumentException>(() =>
            WorldSiteStrataMutationState.Restore(grid,
                save with { CellWidthMeters = save.CellWidthMeters * 2 }));
        Assert.ThrowsExactly<ArgumentException>(() =>
            WorldSiteStrataMutationState.Restore(grid,
                save with { StratumHeightMeters = save.StratumHeightMeters * 2 }));
        Assert.ThrowsExactly<ArgumentException>(() =>
            WorldSiteStrataMutationState.Restore(grid,
                save with { Columns = save.Columns + 1 }));
        Assert.ThrowsExactly<ArgumentException>(() =>
            WorldSiteStrataMutationState.Restore(
                new WorldSiteStrataGrid(Forest(17), cellWidthMeters: grid.CellWidthMeters * 2), save));
        Assert.ThrowsExactly<ArgumentException>(() =>
            WorldSiteStrataMutationState.Restore(grid, save with { Version = save.Version + 1 }));
        Assert.ThrowsExactly<ArgumentException>(() =>
            WorldSiteStrataMutationState.Restore(grid, save with { Changes = [save.Changes[0], save.Changes[0]] }));
        Assert.ThrowsExactly<ArgumentException>(() =>
            WorldSiteStrataMutationState.Restore(grid, save with
            {
                Changes = [save.Changes[0] with { RemainingIntegrity = 0 }],
            }));
        Assert.ThrowsExactly<ArgumentException>(() =>
            WorldSiteStrataMutationState.Restore(grid, save with
            {
                Changes = [save.Changes[0] with { Key = top with { Z = top.Z + 1 } }],
            }));
    }

    [TestMethod]
    public void Xyz1_SameDamageSequenceAndSeedProduceIdenticalDeltasWithoutGameplayRandomness()
    {
        var first = new WorldSiteStrataMutationState(new WorldSiteStrataGrid(Forest(87122)));
        var replay = new WorldSiteStrataMutationState(new WorldSiteStrataGrid(Forest(87122)));
        var grid = new WorldSiteStrataGrid(Forest(87122));
        var center = TopKey(grid, grid.Columns / 2, grid.Rows / 2);
        var neighbors = new[]
        {
            center,
            TopKey(grid, center.X + 1, center.Y),
            TopKey(grid, center.X, center.Y + 1),
        };

        foreach (var state in new[] { first, replay })
        {
            Assert.IsTrue(state.TryDamageCell(neighbors[0], 20, 20));
            Assert.IsTrue(state.TryDamageCell(neighbors[1], 8, 20));
            Assert.IsTrue(state.TryDamageCell(neighbors[2], 4, 20));
            Assert.IsTrue(state.TryDamageCell(neighbors[1], 12, 20));
        }

        Assert.AreEqual(JsonSerializer.Serialize(first.CaptureSave()), JsonSerializer.Serialize(replay.CaptureSave()));
        Assert.IsTrue(first.GetCell(neighbors[0]).IsEmpty);
        Assert.IsTrue(first.GetCell(neighbors[1]).IsEmpty);
        Assert.IsFalse(first.GetCell(neighbors[2]).IsEmpty,
            "Area damage decisions can leave a partially intact neighbor.");
        Assert.AreEqual(WorldSiteCellMutationKind.Damaged, first.FindDelta(neighbors[2])!.Kind);
        Assert.AreEqual(16, first.FindDelta(neighbors[2])!.RemainingIntegrity);
    }
}
