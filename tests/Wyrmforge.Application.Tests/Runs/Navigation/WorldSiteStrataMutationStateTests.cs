using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;

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
