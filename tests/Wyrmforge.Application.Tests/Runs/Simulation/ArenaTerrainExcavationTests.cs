using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class ArenaTerrainExcavationTests
{
    private const double Width = ArenaMetricEnvelope.CombatWidth;
    private const double Height = ArenaMetricEnvelope.CombatHeight;

    private static ArenaEnvironmentState Arena(int seed) =>
        ArenaEnvironmentState.Create(seed, WyrmrealmMapGenerator.GenerateFireTierOne(seed).Where(n => n.Type == WyrmrealmNodeType.Combat).ElementAt(1),
            greybox: true, terrain: true);

    private static ArenaTerrainGrid FlatSoil(int size = 12)
    {
        var grid = new ArenaTerrainGrid(size, size);
        for (var row = 0; row < size; row++)
            for (var column = 0; column < size; column++) grid.Set(column, row, 0, ArenaTerrainMaterial.Soil);
        return grid;
    }

    [TestMethod]
    public void OrdinaryImpact_DigsARoundBowlInsideAboutOneBlockAndNothingBeyondItsRadius()
    {
        var grid = FlatSoil();
        var centre = ArenaTerrainGrid.CenterOf(6, 6);
        var changes = ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(1, centre, 1), null);
        Assert.AreEqual(-1, grid.Surface(6, 6), "the whole block under the impact loses one microcell");
        Assert.AreEqual(ArenaTerrainMaterial.Soil, grid.Material(6, 6));
        Assert.IsTrue(grid.IsSubdivided(6, 6));
        Assert.IsLessThanOrEqualTo(5, changes.Count, "a 0.75 m bowl reaches at most the four neighbouring edges");
        Assert.AreEqual(0, grid.Surface(8, 6));
        Assert.IsFalse(grid.IsSubdivided(8, 6), "ground beyond the radius is never subdivided");
        Assert.IsFalse(grid.IsSubdivided(2, 2));
    }

    [TestMethod]
    public void AnImpactAtABlockCorner_DigsARoundCraterThatSpansFourBlocksAsMicrocolumns()
    {
        var grid = FlatSoil();
        var corner = new Vector2D(6 * ArenaTerrainGrid.CellUnits, 6 * ArenaTerrainGrid.CellUnits);
        ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(1, corner, 3), null);
        foreach (var (column, row) in new[] { (5, 5), (6, 5), (5, 6), (6, 6) }) Assert.IsTrue(grid.IsSubdivided(column, row), $"block {column},{row}");
        // The deepest microcolumns sit at the shared corner, mirrored across all four blocks.
        var inner = grid.MicroSurface(6, 6, 0, 0);
        Assert.AreEqual(inner, grid.MicroSurface(5, 6, 7, 0));
        Assert.AreEqual(inner, grid.MicroSurface(6, 5, 0, 7));
        Assert.AreEqual(inner, grid.MicroSurface(5, 5, 7, 7));
        Assert.IsLessThan(grid.MicroSurface(6, 6, 7, 7), inner, "deeper in the middle than toward the rim");
    }

    [TestMethod]
    public void ACraterStaysSymmetricAndTheCoarseHeightIsTheRoundedMeanOfItsMicrocolumns()
    {
        var grid = FlatSoil();
        ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(1, new Vector2D(6 * 32 + 8, 6 * 32 + 8), 2), null);
        for (var row = 5; row <= 7; row++)
            for (var column = 5; column <= 7; column++)
            {
                if (!grid.IsSubdivided(column, row)) continue;
                var sum = 0;
                for (var y = 0; y < ArenaTerrainGrid.MicroPerColumn; y++)
                    for (var x = 0; x < ArenaTerrainGrid.MicroPerColumn; x++) sum += grid.MicroSurface(column, row, x, y);
                var expected = sum >= 0 ? (sum + 32) / 64 : -((-sum + 32) / 64);
                Assert.AreEqual(expected, grid.Surface(column, row), $"coarse height of {column},{row}");
            }
    }

    [TestMethod]
    public void Craters_ExposeDirtFirstAndStoneOnlyWhereTheyDigDeepest()
    {
        var grid = FlatSoil();
        var centre = ArenaTerrainGrid.CenterOf(6, 6);
        for (var hit = 0; hit < 4; hit++) ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(hit, centre, 3), null);
        var middle = grid.MicroSurface(6, 6, 4, 4);
        Assert.IsLessThan(-ArenaTerrainGrid.SoilDepthMicrocells, middle, "the centre was dug through the soil and dented the stone");
        Assert.AreEqual(ArenaTerrainMaterial.Stone, grid.MicroMaterial(6, 6, 4, 4));
        var outer = grid.MicroSurface(8, 6, 0, 4);
        Assert.IsGreaterThan(-ArenaTerrainGrid.SoilDepthMicrocells, outer, "the outer ring is only dug into the dirt");
        Assert.AreEqual(ArenaTerrainMaterial.Soil, grid.MicroMaterial(8, 6, 0, 4));
    }

    [TestMethod]
    public void RevertingAnImpact_PutsBackTheWholeColumnsAndTheirSubdivision()
    {
        var grid = FlatSoil();
        ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(1, ArenaTerrainGrid.CenterOf(3, 3), 2), null);
        var before = grid.Clone();
        var changes = ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(2, new Vector2D(3 * 32 + 20, 3 * 32 + 10), 3), null);
        Assert.IsNotEmpty(changes);
        ArenaTerrainMutation.Revert(grid, changes);
        for (var row = 0; row < grid.Rows; row++)
            for (var column = 0; column < grid.Columns; column++)
            {
                Assert.AreEqual(before.Surface(column, row), grid.Surface(column, row));
                Assert.AreEqual(before.IsSubdivided(column, row), grid.IsSubdivided(column, row));
                CollectionAssert.AreEqual(before.FineHeights(column, row), grid.FineHeights(column, row));
            }
    }

    [TestMethod]
    public void TheClientFrame_CarriesOnlyTheSubdividedColumnsThatChangedSinceItsRevision()
    {
        var grid = FlatSoil();
        Assert.IsEmpty(grid.ToFrame(-1).Fine, "an undamaged grid sends no fine blocks");
        ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(1, ArenaTerrainGrid.CenterOf(2, 2), 1), null);
        var first = grid.ToFrame(-1);
        Assert.IsNotEmpty(first.Fine);
        Assert.IsTrue(first.Fine.All(block => block.Heights.Length == ArenaTerrainGrid.MicroCount));
        var known = first.Revision;
        Assert.IsEmpty(grid.ToFrame(known).Fine, "nothing changed since the client's revision");
        ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(2, ArenaTerrainGrid.CenterOf(9, 9), 1), null);
        var delta = grid.ToFrame(known);
        Assert.IsTrue(delta.Fine.All(block => block.Index % grid.Columns >= 8 && block.Index / grid.Columns >= 8), "only the new crater's blocks");
        Assert.AreEqual(grid.Surface(2, 2), delta.Surface[2 * grid.Columns + 2], "the coarse heights always travel whole");
    }

    [TestMethod]
    public void ARestoredWholeColumn_IsAnnouncedToTheClientAsAnEmptyBlock()
    {
        var grid = FlatSoil();
        var changes = ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(1, ArenaTerrainGrid.CenterOf(4, 4), 1), null);
        var known = grid.Revision;
        ArenaTerrainMutation.Revert(grid, changes);
        var delta = grid.ToFrame(known);
        Assert.IsTrue(delta.Fine.Any(block => block.Index == 4 * grid.Columns + 4 && block.Heights.Length == 0));
    }

    [TestMethod]
    public void HeavierImpacts_DigWiderAndDeeper()
    {
        var ordinary = FlatSoil();
        var splash = FlatSoil();
        var meteor = FlatSoil();
        var centre = ArenaTerrainGrid.CenterOf(6, 6);
        ArenaTerrainMutation.Apply(ordinary, new ArenaTerrainImpact(1, centre, 1), null);
        var splashChanges = ArenaTerrainMutation.Apply(splash, new ArenaTerrainImpact(1, centre, 2), null);
        var meteorChanges = ArenaTerrainMutation.Apply(meteor, new ArenaTerrainImpact(1, centre, 3), null);
        Assert.IsLessThan(ordinary.Surface(6, 6), splash.Surface(6, 6));
        Assert.IsLessThan(splash.Surface(6, 6), meteor.Surface(6, 6));
        Assert.IsGreaterThan(1, splashChanges.Count);
        Assert.IsGreaterThan(splashChanges.Count, meteorChanges.Count);
        Assert.AreEqual(-3, meteor.Surface(6, 6));
    }

    [TestMethod]
    public void RepeatedImpacts_DigThroughSoilThenWearStoneAndNeverBreakBedrock()
    {
        var grid = FlatSoil();
        var centre = ArenaTerrainGrid.CenterOf(6, 6);
        short Deepest() => grid.FineHeights(6, 6)!.Min();
        for (var hit = 0; hit < 8; hit++) ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(hit, centre, 1), null);
        Assert.AreEqual(-ArenaTerrainGrid.SoilDepthMicrocells, Deepest(), "eight ordinary hits dig the one-metre soil");
        Assert.AreEqual(ArenaTerrainMaterial.Stone, grid.MicroMaterial(6, 6, 4, 4), "dug-through soil exposes stone");
        for (var hit = 8; hit < 10; hit++) ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(hit, centre, 1), null);
        Assert.AreEqual(-ArenaTerrainGrid.SoilDepthMicrocells - 1, Deepest(), "two more ordinary hits wear one microcell off the stone");
        for (var hit = 0; hit < 20; hit++) ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(100 + hit, centre, 2), null);
        Assert.IsLessThan(-ArenaTerrainGrid.SoilDepthMicrocells - 5, Deepest(), "splash impacts wear stone much faster");
        for (var hit = 0; hit < 60; hit++) ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(200 + hit, centre, 3), null);
        Assert.AreEqual(ArenaTerrainGrid.BedrockMicrocells, Deepest(), "Meteor Heart reaches bedrock and bedrock never breaks");
    }

    [TestMethod]
    public void RockWalls_WearAwayProgressivelyUnderEveryKindOfImpactAndLavaWearsLikeStone()
    {
        var grid = FlatSoil();
        grid.Set(6, 6, 16, ArenaTerrainMaterial.Stone);
        grid.Set(7, 6, -16, ArenaTerrainMaterial.Lava);
        var centre = ArenaTerrainGrid.CenterOf(6, 6);
        ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(1, centre, 1), null);
        Assert.AreEqual(16, grid.FineHeights(6, 6)!.Min(), "one ordinary hit only cracks the rock: wear is stored, nothing has fallen yet");
        Assert.IsNotNull(grid.FineWear(6, 6), "the damage is authoritative state");
        for (var hit = 2; hit <= 2; hit++) ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(hit, centre, 1), null);
        Assert.AreEqual(15, grid.FineHeights(6, 6)!.Min(), "the second ordinary hit breaks the first 12.5 cm");
        for (var hit = 10; hit < 24; hit++) ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(hit, centre, 1), null);
        Assert.AreEqual(8, grid.FineHeights(6, 6)!.Min(), "sixteen plain Fireballs take exactly one metre off the centre of a two metre wall");
        ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(500, ArenaTerrainGrid.CenterOf(7, 6), 3), null);
        Assert.IsLessThan(-16, grid.FineHeights(7, 6)!.Min(), "only bedrock and the route floor are unbreakable: a heavy blast digs into lava too");
        Assert.AreEqual(ArenaTerrainMaterial.Lava, grid.Material(7, 6), "it stays lava until a freeze mechanic exists");
    }

    [TestMethod]
    public void StoneWear_CarriesOverBetweenHitsAndIsRevertedAndRecordedExactly()
    {
        var grid = FlatSoil();
        grid.Set(6, 6, 16, ArenaTerrainMaterial.Stone);
        var centre = ArenaTerrainGrid.CenterOf(6, 6);
        ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(1, centre, 1), null);
        var wearAfterOne = grid.FineWear(6, 6)!;
        Assert.IsTrue(wearAfterOne.Max() is > 0 and < ArenaTerrainGrid.StoneWearPerMicrocell, "wear stays below the break threshold");
        var before = grid.Clone();
        var changes = ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(2, centre, 1), null);
        Assert.IsTrue(changes.Any(change => change.OldWear is not null && change.NewWear is not null && !change.OldWear.AsSpan().SequenceEqual(change.NewWear)));
        ArenaTerrainMutation.Revert(grid, changes);
        CollectionAssert.AreEqual(before.FineWear(6, 6), grid.FineWear(6, 6), "reverting restores wear as well as height");
        CollectionAssert.AreEqual(before.FineHeights(6, 6), grid.FineHeights(6, 6));
    }

    [TestMethod]
    public void StoneWear_SurvivesTheSavedRecordAndRejectsMalformedCounters()
    {
        var arena = Arena(1204);
        var hunter = new Vector2D(Width / 2, Height / 2);
        for (var id = 1; id <= 60; id++)
            arena.ApplyTerrainImpact(new ArenaTerrainImpact(id, new Vector2D(300, 700), 1), hunter, 12, Width, Height);
        var record = arena.CaptureTerrainRecord("site-1")!;
        Assert.IsTrue(record.Changed.Any(column => column.Wear is { Length: ArenaTerrainGrid.MicroCount }), "worn stone is part of the record");
        var restored = Arena(1204);
        restored.RestoreTerrainRecord("site-1", ArenaTerrainRecord.FromJson(record.ToJson()));
        Assert.AreEqual(record.ToJson(), restored.CaptureTerrainRecord("site-1")!.ToJson(), "the JSON round trip keeps every wear counter");
        var worn = record.Changed.First(column => column.Wear is not null);
        Assert.ThrowsExactly<InvalidDataException>(() => Arena(1204).RestoreTerrainRecord("site-1", record with { Changed = [worn with { Wear = new byte[5] }] }));
        Assert.ThrowsExactly<InvalidDataException>(() => Arena(1204).RestoreTerrainRecord("site-1",
            record with { Changed = [worn with { Wear = Enumerable.Repeat((byte)200, ArenaTerrainGrid.MicroCount).ToArray() }] }));
    }
    [TestMethod]
    public void ACrackAlone_IsAVisibleChangeAndTheClientFrameCarriesTheWearAsInts()
    {
        var grid = FlatSoil();
        grid.Set(6, 6, 16, ArenaTerrainMaterial.Stone);
        var known = grid.Revision;
        ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(1, ArenaTerrainGrid.CenterOf(6, 6), 1), null);
        Assert.AreEqual(16, grid.Surface(6, 6), "nothing has fallen yet");
        Assert.IsGreaterThan(known, grid.Revision, "a crack alone is a visible change the client must pull");
        var block = grid.ToFrame(known).Fine.Single(candidate => candidate.Index == 6 * grid.Columns + 6);
        Assert.IsNotNull(block.Wear);
        Assert.HasCount(ArenaTerrainGrid.MicroCount, block.Wear);
        Assert.IsGreaterThan(0, block.Wear.Max());
        Assert.IsLessThan(ArenaTerrainGrid.StoneWearPerMicrocell, block.Wear.Max());
        Assert.IsNull(FlatSoil().ToFrame(-1).Fine.FirstOrDefault()?.Wear, "undamaged ground carries no wear");
    }
    private static ArenaTerrainGrid WallEastOfColumnSix()
    {
        var grid = FlatSoil();
        for (var row = 4; row <= 8; row++) grid.Set(6, row, 16, ArenaTerrainMaterial.Stone);
        return grid;
    }

    private static ArenaTerrainImpact SideHit(long id, int power = 1) =>
        new(id, new Vector2D(6 * ArenaTerrainGrid.CellUnits - 2, 6.5 * ArenaTerrainGrid.CellUnits), power, new Vector2D(1, 0), ArenaTerrainGrid.ShotClearanceMicrocells);

    [TestMethod]
    public void AShotThatStopsAtARockFace_IsASideHitAtTheHeightItFlew()
    {
        var grid = WallEastOfColumnSix();
        var from = new Vector2D(4.5 * ArenaTerrainGrid.CellUnits, 6.5 * ArenaTerrainGrid.CellUnits);
        var contact = new Vector2D(6 * ArenaTerrainGrid.CellUnits - 2, 6.5 * ArenaTerrainGrid.CellUnits);
        Assert.AreEqual(ArenaTerrainGrid.ShotClearanceMicrocells, grid.FaceHitHeight(from, contact, new Vector2D(1, 0)));
        Assert.IsNull(grid.FaceHitHeight(from, new Vector2D(5.2 * ArenaTerrainGrid.CellUnits, 6.5 * ArenaTerrainGrid.CellUnits), new Vector2D(1, 0)), "open ground is a hit from above");
        Assert.IsNull(FlatSoil().FaceHitHeight(from, contact, new Vector2D(1, 0)), "no wall, no side hit");
    }

    [TestMethod]
    public void ASideHit_BitesTheWallFaceAndNeverTheGroundInFrontOfIt()
    {
        var grid = WallEastOfColumnSix();
        for (var hit = 0; hit < 24; hit++) ArenaTerrainMutation.Apply(grid, SideHit(hit), null);
        Assert.IsFalse(grid.IsSubdivided(5, 6), "the floor in front of the wall is untouched");
        Assert.IsFalse(grid.IsSubdivided(4, 6));
        var wall = grid.FineHeights(6, 6)!;
        Assert.IsLessThan(16, wall.Min(), "the face has been worn down");
        // The bite reaches only a few microcells into the wall: the far side keeps its full height.
        for (var microY = 0; microY < ArenaTerrainGrid.MicroPerColumn; microY++)
            Assert.AreEqual(16, wall[microY * ArenaTerrainGrid.MicroPerColumn + 7], "the back of the wall is untouched");
        var faceRows = Enumerable.Range(0, ArenaTerrainGrid.MicroPerColumn).Select(microY => wall[microY * ArenaTerrainGrid.MicroPerColumn]).ToArray();
        Assert.IsLessThan(faceRows[0], faceRows[3], "deepest where the shot struck, shallower toward the ends");
    }

    [TestMethod]
    public void ASideHit_IsDeterministicAndRevertsExactlyIncludingWear()
    {
        string Run()
        {
            var grid = WallEastOfColumnSix();
            for (var hit = 0; hit < 10; hit++) ArenaTerrainMutation.Apply(grid, SideHit(hit, 1 + hit % 3), null);
            return string.Join(',', grid.FineHeights(6, 6)!) + "|" + string.Join(',', grid.FineWear(6, 6)!);
        }
        Assert.AreEqual(Run(), Run());
        var wall = WallEastOfColumnSix();
        var before = wall.Clone();
        var changes = ArenaTerrainMutation.Apply(wall, SideHit(1, 3), null);
        Assert.IsNotEmpty(changes);
        ArenaTerrainMutation.Revert(wall, changes);
        CollectionAssert.AreEqual(before.FineHeights(6, 6), wall.FineHeights(6, 6));
        CollectionAssert.AreEqual(before.FineWear(6, 6), wall.FineWear(6, 6));
    }

    [TestMethod]
    public void BiggerBlasts_BiteDeeperIntoTheFaceAndTheBiteConservesAboutTheVolumeOfTheCrater()
    {
        var depths = new List<int>();
        foreach (var power in new[] { 1, 2, 3 })
        {
            var grid = WallEastOfColumnSix();
            for (var hit = 0; hit < 40; hit++) ArenaTerrainMutation.Apply(grid, SideHit(hit, power), null);
            depths.Add(16 - grid.FineHeights(6, 6)!.Min());
        }
        Assert.IsLessThan(depths[1], depths[0]);
        Assert.IsLessThan(depths[2], depths[1]);
        Assert.IsLessThanOrEqualTo(ArenaTerrainMutation.FaceBiteRadiusMicrocells(3), ArenaTerrainMutation.FaceBiteRadiusMicrocells(3));
        Assert.AreEqual(3, ArenaTerrainMutation.FaceBiteRadiusMicrocells(1));
        Assert.AreEqual(8, ArenaTerrainMutation.FaceBiteRadiusMicrocells(3));
    }

    [TestMethod]
    public void ATopDownHitOnAWall_StillDigsACraterIntoItsTop()
    {
        var grid = WallEastOfColumnSix();
        for (var hit = 0; hit < 12; hit++) ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(hit, ArenaTerrainGrid.CenterOf(6, 6), 2), null);
        var wall = grid.FineHeights(6, 6)!;
        Assert.IsLessThan(16, wall[3 * ArenaTerrainGrid.MicroPerColumn + 3], "a hit from above craters the top of the wall");
        Assert.IsFalse(grid.IsSubdivided(6, 8), "while wall beyond the blast radius stays whole");
    }
    [TestMethod]
    public void ProtectedRoute_NeverDropsBelowHalfAMetre()
    {
        var grid = FlatSoil();
        var guarded = new bool[grid.Columns * grid.Rows];
        guarded[6 * grid.Columns + 6] = true;
        for (var hit = 0; hit < 30; hit++)
            ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(hit, ArenaTerrainGrid.CenterOf(6, 6), 3), guarded);
        Assert.AreEqual(ArenaTerrainMutation.RouteFloorMicrocells, grid.Surface(6, 6));
    }

    [TestMethod]
    public void Revert_RestoresEveryColumnExactly()
    {
        var grid = FlatSoil();
        var before = grid.Clone();
        var changes = ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(1, ArenaTerrainGrid.CenterOf(5, 5), 3), null);
        Assert.IsGreaterThan(0, changes.Count);
        ArenaTerrainMutation.Revert(grid, changes);
        for (var row = 0; row < grid.Rows; row++)
            for (var column = 0; column < grid.Columns; column++)
            {
                Assert.AreEqual(before.Surface(column, row), grid.Surface(column, row));
                Assert.AreEqual(before.Material(column, row), grid.Material(column, row));
                Assert.AreEqual(before.StoneTop(column, row), grid.StoneTop(column, row));
            }
    }

    [TestMethod]
    public void AnImpactId_AppliesExactlyOnce()
    {
        var arena = Arena(1204);
        var hunter = new Vector2D(Width / 2, Height / 2);
        var impact = new ArenaTerrainImpact(7, new Vector2D(300, 700), 3);
        var first = arena.ApplyTerrainImpact(impact, hunter, 12, Width, Height);
        var revision = arena.Terrain!.Revision;
        Assert.IsGreaterThan(0, first.Count);
        Assert.AreEqual(0, arena.ApplyTerrainImpact(impact, hunter, 12, Width, Height).Count, "a retransmitted blast changes nothing");
        Assert.AreEqual(revision, arena.Terrain.Revision);
    }

    [TestMethod]
    public void ThousandsOfImpacts_NeverCutTheHunterOffFromTheExit()
    {
        for (var seed = 0; seed < 12; seed++)
        {
            var arena = Arena(seed);
            var hunter = new Vector2D(Width / 2, Height / 2);
            var rng = new Random(seed);
            for (var id = 1; id <= 600; id++)
            {
                var at = new Vector2D(rng.NextDouble() * Width, rng.NextDouble() * Height);
                arena.ApplyTerrainImpact(new ArenaTerrainImpact(id, at, 1 + rng.Next(3)), hunter, 12, Width, Height);
            }
            var grid = arena.Terrain!;
            var exit = ArenaTerrainGrid.ColumnOf(new Vector2D(Width / 2, Math.Max(80, Height * .11)));
            Assert.IsTrue(grid.IsReachable(ArenaTerrainGrid.ColumnOf(hunter), exit, 12), $"seed {seed}");
        }
    }

    [TestMethod]
    public void Replay_OfTheSameImpactsGivesAnIdenticalRecord()
    {
        string Run()
        {
            var arena = Arena(1204);
            var hunter = new Vector2D(Width / 2, Height / 2);
            var rng = new Random(5);
            for (var id = 1; id <= 80; id++)
                arena.ApplyTerrainImpact(new ArenaTerrainImpact(id, new Vector2D(rng.NextDouble() * Width, rng.NextDouble() * Height), 1 + rng.Next(3)), hunter, 12, Width, Height);
            return arena.CaptureTerrainRecord("site-1")!.ToJson();
        }
        Assert.AreEqual(Run(), Run());
    }

    [TestMethod]
    public void Record_RestoresDamageOntoAFreshArenaAndKeepsImpactsExactlyOnce()
    {
        var damaged = Arena(1204);
        var hunter = new Vector2D(Width / 2, Height / 2);
        for (var id = 1; id <= 30; id++)
            damaged.ApplyTerrainImpact(new ArenaTerrainImpact(id, new Vector2D(200 + id * 20, 500 + id * 25), 2), hunter, 12, Width, Height);
        var json = damaged.CaptureTerrainRecord("site-1")!.ToJson();

        var fresh = Arena(1204);
        fresh.RestoreTerrainRecord("site-1", ArenaTerrainRecord.FromJson(json));
        Assert.AreEqual(json, fresh.CaptureTerrainRecord("site-1")!.ToJson());
        Assert.AreEqual(0, fresh.ApplyTerrainImpact(new ArenaTerrainImpact(5, new Vector2D(300, 625), 3), hunter, 12, Width, Height).Count,
            "a restored impact id is never applied twice");
    }

    [TestMethod]
    public void Record_RejectsForeignSitesVersionsSizesAndMalformedColumns()
    {
        var arena = Arena(1204);
        arena.ApplyTerrainImpact(new ArenaTerrainImpact(1, new Vector2D(300, 700), 3), new Vector2D(Width / 2, Height / 2), 12, Width, Height);
        var record = arena.CaptureTerrainRecord("site-1")!;
        Assert.ThrowsExactly<InvalidDataException>(() => Arena(1204).RestoreTerrainRecord("site-2", record));
        Assert.ThrowsExactly<InvalidDataException>(() => Arena(1204).RestoreTerrainRecord("site-1", record with { Version = 99 }));
        Assert.ThrowsExactly<InvalidDataException>(() => Arena(1204).RestoreTerrainRecord("site-1", record with { Columns = 31 }));
        Assert.ThrowsExactly<InvalidDataException>(() => Arena(1204).RestoreTerrainRecord("site-1",
            record with { Changed = [new ArenaTerrainRecord.Column(999, 0, 0, ArenaTerrainMaterial.Soil)] }));
        Assert.ThrowsExactly<InvalidDataException>(() => Arena(1204).RestoreTerrainRecord("site-1",
            record with { Changed = [.. record.Changed, record.Changed[0]] }));
    }

    [TestMethod]
    public void TerrainFrame_IsServedOnlyWhenTheRevisionChangesAndIsACopy()
    {
        var simulation = new RunSimulationFactory(new SeededRandomSource(42))
            .Create(new HashSet<string>(), seed: 42, hunt: HuntSelection.FireTierOne);
        Assert.IsNull(simulation.TerrainFrame(-1), "no terrain until the Hunt 1.0 flag is on");
        simulation.EnableHunt1Terrain();
        Assert.IsTrue(simulation.ChoosePrimary(Wyrmforge.Domain.Spells.SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        var snapshot = simulation.CreateSnapshot();
        var terrain = snapshot.Environment!.Terrain!;
        var frame = simulation.TerrainFrame(-1)!;
        Assert.AreEqual(terrain.Revision, frame.Revision);
        Assert.AreEqual(terrain.Columns * terrain.Rows, frame.Surface.Length);
        Assert.AreEqual(frame.Surface.Length, frame.Material.Length);
        Assert.IsNull(simulation.TerrainFrame(frame.Revision), "an unchanged revision sends nothing");
        frame.Surface[0] = 999;
        Assert.AreNotEqual(999, simulation.TerrainFrame(-1)!.Surface[0], "presentation can never edit the authoritative grid");
    }

    [TestMethod]
    public void Record_CarriesSubdividedColumnsAndRejectsMalformedFineData()
    {
        var arena = Arena(1204);
        arena.ApplyTerrainImpact(new ArenaTerrainImpact(1, new Vector2D(300, 700), 3), new Vector2D(Width / 2, Height / 2), 12, Width, Height);
        var record = arena.CaptureTerrainRecord("site-1")!;
        Assert.IsTrue(record.Changed.Any(column => column.Fine is { Length: ArenaTerrainGrid.MicroCount }), "damaged columns carry their 64 microcolumns");
        var restored = Arena(1204);
        restored.RestoreTerrainRecord("site-1", ArenaTerrainRecord.FromJson(record.ToJson()));
        Assert.AreEqual(record.ToJson(), restored.CaptureTerrainRecord("site-1")!.ToJson(), "the JSON round trip keeps every microcolumn");
        var damaged = record.Changed.First(column => column.Fine is not null);
        Assert.ThrowsExactly<InvalidDataException>(() => Arena(1204).RestoreTerrainRecord("site-1",
            record with { Changed = [damaged with { Fine = new short[3] }] }));
        Assert.ThrowsExactly<InvalidDataException>(() => Arena(1204).RestoreTerrainRecord("site-1",
            record with { Changed = [damaged with { Fine = Enumerable.Repeat((short)-999, ArenaTerrainGrid.MicroCount).ToArray() }] }));
    }

    [TestMethod]
    public void HigherPowers_DigWiderAndDeeperStillAndPowerIsClampedToFive()
    {
        var volumes = new List<int>();
        foreach (var power in new[] { 1, 2, 3, 4, 5 })
        {
            var grid = FlatSoil();
            ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(1, ArenaTerrainGrid.CenterOf(6, 6), power), null);
            var volume = 0;
            for (var row = 0; row < 12; row++)
                for (var column = 0; column < 12; column++)
                    for (var micro = 0; micro < ArenaTerrainGrid.MicroCount; micro++)
                        volume -= grid.MicroSurface(column, row, micro % 8, micro / 8);
            volumes.Add(volume);
        }
        for (var i = 1; i < volumes.Count; i++) Assert.IsGreaterThan(volumes[i - 1], volumes[i], $"power {i + 1} digs more than power {i}");
        var clamped = FlatSoil();
        ArenaTerrainMutation.Apply(clamped, new ArenaTerrainImpact(1, ArenaTerrainGrid.CenterOf(6, 6), 99), null);
        Assert.AreEqual(ArenaTerrainMutation.RadiusUnits(5), ArenaTerrainMutation.RadiusUnits(99));
    }

    [TestMethod]
    public void ASpireLeftBesideAnImpact_FallsInsteadOfFloating()
    {
        var grid = FlatSoil();
        grid.Set(6, 6, 16, ArenaTerrainMaterial.Stone);
        for (var micro = 0; micro < ArenaTerrainGrid.MicroCount; micro++)
            if (micro != 3 * 8 + 3) grid.LowerMicroTo(6, 6, micro % 8, micro / 8, 0);
        Assert.AreEqual(16, grid.MicroSurface(6, 6, 3, 3));
        var at = ArenaTerrainGrid.CenterOf(6, 6) + new Vector2D(2 * ArenaTerrainGrid.MicroUnits, 0);
        ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(1, at, 1), null);
        Assert.IsLessThanOrEqualTo(3, grid.MicroSurface(6, 6, 3, 3), "a sliver of rock with nothing beside it collapses to just above its support");
    }

    [TestMethod]
    public void AfterAnyImpact_NoFinOrSpireStandsInTheBlastZone()
    {
        var arena = Arena(11);
        var grid = arena.Terrain!;
        var random = new Random(7);
        for (var hit = 0; hit < 80; hit++)
        {
            var at = new Vector2D(100 + random.NextDouble() * (Width - 200), 100 + random.NextDouble() * (Height - 200));
            var power = 1 + random.Next(5);
            ArenaTerrainMutation.Apply(grid, new ArenaTerrainImpact(10_000 + hit, at, power), null);
            var reach = ArenaTerrainMutation.RadiusUnits(power) / ArenaTerrainGrid.MicroUnits - 2;
            var (centreX, centreY) = ((int)(at.X / ArenaTerrainGrid.MicroUnits), (int)(at.Y / ArenaTerrainGrid.MicroUnits));
            for (var gy = centreY - (int)reach; gy <= centreY + reach; gy++)
                for (var gx = centreX - (int)reach; gx <= centreX + reach; gx++)
                {
                    int? H(int x, int y) => grid.Contains(x / 8, y / 8) && x >= 0 && y >= 0 ? grid.MicroSurface(x / 8, y / 8, x % 8, y % 8) : null;
                    if (H(gx, gy) is not { } own || own <= ArenaTerrainGrid.BedrockMicrocells) continue;
                    var (w, e, n, s) = (H(gx - 1, gy) ?? own, H(gx + 1, gy) ?? own, H(gx, gy - 1) ?? own, H(gx, gy + 1) ?? own);
                    var limit = ArenaTerrainMutation.UnsupportedLimitMicrocells;
                    Assert.IsFalse(own - w >= limit && own - e >= limit, $"fin along x at {gx},{gy} after hit {hit}");
                    Assert.IsFalse(own - n >= limit && own - s >= limit, $"fin along y at {gx},{gy} after hit {hit}");
                }
        }
    }

    [TestMethod]
    public void EnemyMagic_BreaksTheGroundByTheSameRule()
    {
        var simulation = new RunSimulationFactory(new SeededRandomSource(42))
            .Create(new HashSet<string>(), seed: 42, hunt: HuntSelection.FireTierOne);
        simulation.EnableHunt1Terrain();
        Assert.IsTrue(simulation.ChoosePrimary(Wyrmforge.Domain.Spells.SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        simulation.Tick(.05, default, 390, 700);
        var flags = System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic;
        var blast = typeof(RunSimulation).GetMethod("EnemyTerrainBlast", flags)!;
        var before = simulation.TerrainChangesThisTick.Count;
        // Away from the route and the player: a power-3 enemy blast must dig.
        blast.Invoke(simulation, [new Vector2D(60, Height * .5), 3]);
        Assert.IsGreaterThan(before, simulation.TerrainChangesThisTick.Count, "enemy magic digs the ground");
    }

    [TestMethod]
    public void LiveFireballs_ExcavateTheGroundDuringAFight()
    {
        var simulation = new RunSimulationFactory(new SeededRandomSource(42))
            .Create(new HashSet<string>(), seed: 42, hunt: HuntSelection.FireTierOne);
        simulation.EnableHunt1Terrain();
        Assert.IsTrue(simulation.ChoosePrimary(Wyrmforge.Domain.Spells.SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        var player = (Wyrmforge.Domain.Combat.Player.PlayerState)typeof(RunSimulation)
            .GetField("player", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.GetValue(simulation)!;
        var changed = 0;
        for (var tick = 0; tick < 20 * 120 && changed == 0; tick++)
        {
            player.Health = simulation.MaxHealth;
            simulation.Tick(.05, default, 390, 700);
            while (simulation.PendingChoices.Count > 0) Assert.IsTrue(simulation.ApplyChoice(simulation.PendingChoices[0].Id));
            changed += simulation.TerrainChangesThisTick.Count;
        }
        Assert.IsGreaterThan(0, changed, "Fireball contacts must chip the ground");
    }
}
