using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class ArenaTerrainTests
{
    private const int Columns = 32;
    private const int Rows = 60;
    private const double PlayerRadius = 12;
    private static readonly (int Column, int Row) Spawn = (16, 52);
    private static readonly (int Column, int Row) Exit = (16, 6);

    private static ArenaTerrainRecipe Make(int seed, double influence) =>
        ArenaTerrainGenerator.Generate(seed, influence, Columns, Rows, Spawn, Exit);

    private static double Dist2(double x, double y) => x * x + y * y;

    private static string Fingerprint(ArenaTerrainGrid grid)
    {
        var hash = 17L;
        for (var row = 0; row < grid.Rows; row++)
            for (var column = 0; column < grid.Columns; column++)
                hash = unchecked(hash * 1_000_003 + grid.Surface(column, row) * 8 + (int)grid.Material(column, row));
        return hash.ToString("X");
    }

    [TestMethod]
    [DataRow(0d)]
    [DataRow(.3)]
    [DataRow(.7)]
    [DataRow(.95)]
    [DataRow(1d)]
    public void ThousandSeeds_AlwaysKeepAFlatWalkableRouteFromSpawnToExit(double influence)
    {
        for (var seed = 0; seed < 1000; seed++)
        {
            var recipe = Make(seed, influence);
            var grid = recipe.Grid;
            foreach (var (column, row) in recipe.ProtectedRoute)
            {
                Assert.AreEqual(0, grid.Surface(column, row), $"seed {seed}: route must be flat");
                Assert.AreNotEqual(ArenaTerrainMaterial.Lava, grid.Material(column, row), $"seed {seed}");
            }
            Assert.IsTrue(grid.IsReachable(recipe.Spawn, recipe.Exit, PlayerRadius), $"seed {seed} influence {influence}");
            Assert.IsTrue(grid.IsStandable(ArenaTerrainGrid.CenterOf(Spawn.Column, Spawn.Row), PlayerRadius), $"seed {seed}");
            Assert.IsTrue(grid.IsStandable(ArenaTerrainGrid.CenterOf(Exit.Column, Exit.Row), PlayerRadius), $"seed {seed}");
        }
    }

    [TestMethod]
    public void Generation_IsDeterministicAndIndependentOfCallOrder()
    {
        var first = Fingerprint(Make(1204, .7).Grid);
        _ = Make(99, .2);
        Assert.AreEqual(first, Fingerprint(Make(1204, .7).Grid));
        Assert.AreNotEqual(first, Fingerprint(Make(1205, .7).Grid));
    }

    [TestMethod]
    public void SiteLandform_ShiftsWoodlandAndMountainZonesWithoutChangingTheSafeRoad()
    {
        var wetland = ArenaTerrainGenerator.Generate(1204, .3, Columns, Rows, Spawn, Exit,
            siteProfile: new WorldSiteGenerationProfile(WorldSiteLandform.Wetland, WorldSiteLandmark.None));
        var mountain = ArenaTerrainGenerator.Generate(1204, .3, Columns, Rows, Spawn, Exit,
            siteProfile: new WorldSiteGenerationProfile(WorldSiteLandform.Mountain, WorldSiteLandmark.None));
        Assert.IsGreaterThan(mountain.Zones.Count(zone => zone == ArenaZone.Forest), wetland.Zones.Count(zone => zone == ArenaZone.Forest));
        Assert.IsGreaterThan(wetland.Zones.Count(zone => zone == ArenaZone.Highland), mountain.Zones.Count(zone => zone == ArenaZone.Highland));
        CollectionAssert.AreEqual(wetland.Grid.Road.ToArray(), mountain.Grid.Road.ToArray(), "site geography must not block or move the road");
        Assert.IsTrue(wetland.Grid.IsReachable(Spawn, Exit, PlayerRadius));
        Assert.IsTrue(mountain.Grid.IsReachable(Spawn, Exit, PlayerRadius));
    }

    [TestMethod]
    public void Influence_ControlsScarsCracksFissuresAndLava()
    {
        var cracked = 0;
        for (var seed = 0; seed < 200; seed++)
        {
            var natural = Make(seed, .1);
            Assert.IsFalse(Cells(natural.Grid).Any(cell => cell.Surface < 0), $"seed {seed}: no pits in a natural forest");
            Assert.IsFalse(Cells(natural.Grid).Any(cell => cell.Material == ArenaTerrainMaterial.Lava), $"seed {seed}");
            Assert.IsEmpty(natural.Grid.Cracks, $"seed {seed}: the land only cracks once the Wyrm's heat reaches it");

            var scorched = Make(seed, .3).Grid;
            Assert.IsTrue(Cells(scorched).Any(cell => cell.Surface < 0), $"seed {seed}: scorched land carries old blast scars");
            Assert.IsFalse(Cells(scorched).Any(cell => cell.Material == ArenaTerrainMaterial.Lava), $"seed {seed}: no lava before Burning");
            if (scorched.Cracks.Count > 0) cracked++;

            var burning = Cells(Make(seed, .7).Grid).ToArray();
            Assert.IsTrue(burning.Any(cell => cell.Surface <= -16), $"seed {seed}: burning land is split by fissures");
            Assert.IsTrue(Cells(Make(seed, 1).Grid).Any(cell => cell.Material == ArenaTerrainMaterial.Lava), $"seed {seed}");
        }
        Assert.IsGreaterThan(180, cracked, "almost every scorched arena carries heat cracks");
    }

    [TestMethod]
    public void BurningLand_HasLavaPoolsWithABasaltLipAwayFromTheRoute()
    {
        var withPools = 0;
        for (var seed = 0; seed < 100; seed++)
        {
            var recipe = Make(seed, .7);
            var grid = recipe.Grid;
            var lava = Cells(grid).Where(cell => cell.Material == ArenaTerrainMaterial.Lava && cell.Surface == -8).ToArray();
            if (lava.Length == 0) continue;
            withPools++;
            Assert.IsTrue(lava.Any(cell => new[] { (1, 0), (-1, 0), (0, 1), (0, -1) }.Any(offset =>
                grid.Contains(cell.Column + offset.Item1, cell.Row + offset.Item2) && grid.Material(cell.Column + offset.Item1, cell.Row + offset.Item2) == ArenaTerrainMaterial.Stone
                && grid.Surface(cell.Column + offset.Item1, cell.Row + offset.Item2) > 0)), $"seed {seed}: pools are ringed by a raised basalt lip");
            foreach (var cell in lava)
                Assert.IsFalse(recipe.ProtectedCells[cell.Row * Columns + cell.Column], $"seed {seed}: lava never reaches the route");
        }
        Assert.IsGreaterThan(80, withPools);
    }

    [TestMethod]
    public void EveryArena_OffersReliefRidgesPillarsAndGentleWalkableHills()
    {
        for (var seed = 0; seed < 100; seed++)
        {
            var grid = Make(seed, 0).Grid;
            Assert.IsTrue(Cells(grid).Any(cell => cell.Material == ArenaTerrainMaterial.Soil && cell.Surface > 0), $"seed {seed}: rolling ground");
            Assert.IsGreaterThan(4, Cells(grid).Count(cell => cell.Material is ArenaTerrainMaterial.Stone or ArenaTerrainMaterial.Boulder && cell.Surface >= 12), $"seed {seed}: ridges and pillars give cover");
            // Hills are walkable: soil never steps more than the climbable half metre from a soil neighbour.
            foreach (var cell in Cells(grid).Where(cell => cell.Material == ArenaTerrainMaterial.Soil))
                foreach (var offset in new[] { (1, 0), (0, 1) })
                {
                    var (column, row) = (cell.Column + offset.Item1, cell.Row + offset.Item2);
                    if (grid.Contains(column, row) && grid.Material(column, row) == ArenaTerrainMaterial.Soil)
                        Assert.IsLessThanOrEqualTo(ArenaTerrainGrid.MaxStepMicrocells, Math.Abs(cell.Surface - grid.Surface(column, row)), $"seed {seed} at {cell.Column},{cell.Row}");
                }
        }
    }

    [TestMethod]
    public void HeatCracks_AreLongBranchingPathsOfAdjacentMicrocellsThatAvoidTheRoute()
    {
        var forks = 0;
        for (var seed = 0; seed < 60; seed++)
        {
            var recipe = Make(seed, .8);
            var cells = new HashSet<(int, int)>();
            foreach (var path in recipe.Grid.Cracks)
            {
                Assert.IsGreaterThanOrEqualTo(16, path.Length, "a crack is at least eight cells long");
                for (var i = 0; i < path.Length; i += 2)
                {
                    var (x, y) = (path[i], path[i + 1]);
                    Assert.IsTrue(x >= 0 && y >= 0 && x < Columns * 8 && y < Rows * 8, $"seed {seed}: inside the arena");
                    Assert.IsFalse(recipe.ProtectedCells[y / 8 * Columns + x / 8], $"seed {seed}: cracks never cross the route");
                    if (i > 0) Assert.AreEqual(1, Math.Abs(x - path[i - 2]) + Math.Abs(y - path[i - 1]), $"seed {seed}: 4-adjacent steps");
                    if (!cells.Add((x, y))) forks++;
                }
            }
        }
        Assert.IsGreaterThan(20, forks, "forks share cells with the crack they leave");
    }
    [TestMethod]
    public void Trees_AreWoodenTrunksAwayFromTheRouteThatFireWearsDown()
    {
        foreach (var (seed, influence) in new[] { (7, 0.1), (23, 0.4), (11, 0.7), (23, 0.95) })
        {
            var recipe = Make(seed, influence);
            var grid = recipe.Grid;
            var trunks = Cells(grid).Where(cell => cell.Material == ArenaTerrainMaterial.Wood).ToList();
            Assert.IsGreaterThanOrEqualTo(3, trunks.Count, $"seed {seed} influence {influence}: every arena has trees");
            foreach (var trunk in trunks)
            {
                Assert.IsGreaterThanOrEqualTo(influence >= .85 ? 8 : 16, trunk.Surface);
                for (var dy = -2; dy <= 2; dy++)
                    for (var dx = -2; dx <= 2; dx++)
                    {
                        var (c, r) = (trunk.Column + dx, trunk.Row + dy);
                        if (grid.Contains(c, r)) Assert.IsFalse(recipe.ProtectedCells[r * grid.Columns + c], $"seed {seed}: a tree stands within two columns of the route");
                    }
            }
        }
        var arena = Make(7, 0.1);
        var tree = Cells(arena.Grid).First(cell => cell.Material == ArenaTerrainMaterial.Wood);
        var before = arena.Grid.MicroSurface(tree.Column, tree.Row, 3, 3);
        for (var hit = 0; hit < 6; hit++) ArenaTerrainMutation.Apply(arena.Grid, new ArenaTerrainImpact(hit, ArenaTerrainGrid.CenterOf(tree.Column, tree.Row), 3), arena.ProtectedCells);
        Assert.IsLessThan(before, arena.Grid.MicroSurface(tree.Column, tree.Row, 3, 3), "fire burns a trunk down");
        Assert.AreEqual(ArenaTerrainMaterial.Wood, arena.Grid.MicroMaterial(tree.Column, tree.Row, 3, 3), "a worn trunk is still wood");
    }

    [TestMethod]
    public void Boulders_AreBreakableStoneAwayFromTheRouteThatShrinkAsFireWearsThemDown()
    {
        foreach (var (seed, influence) in new[] { (7, 0.1), (23, 0.4), (11, 0.7), (23, 0.95) })
        {
            var recipe = Make(seed, influence);
            var boulders = Cells(recipe.Grid).Where(cell => cell.Material == ArenaTerrainMaterial.Boulder).ToList();
            Assert.IsGreaterThanOrEqualTo(3, boulders.Count, $"seed {seed}: every arena has boulders");
            foreach (var boulder in boulders)
                Assert.IsFalse(recipe.ProtectedCells[boulder.Row * Columns + boulder.Column], $"seed {seed}: a boulder never sits on the route");
        }
        var arena = Make(7, 0.1);
        var rock = Cells(arena.Grid).First(cell => cell.Material == ArenaTerrainMaterial.Boulder && cell.Surface >= 12);
        var before = arena.Grid.Surface(rock.Column, rock.Row);
        for (var hit = 0; hit < 8; hit++) ArenaTerrainMutation.Apply(arena.Grid, new ArenaTerrainImpact(hit, ArenaTerrainGrid.CenterOf(rock.Column, rock.Row), 3), arena.ProtectedCells);
        Assert.IsLessThan(before, arena.Grid.Surface(rock.Column, rock.Row), "fire breaks a boulder down");
        Assert.AreEqual(ArenaTerrainMaterial.Boulder, arena.Grid.MicroMaterial(rock.Column, rock.Row, 3, 3), "a worn boulder is still rock");
    }

    [TestMethod]
    public void GeneratedArenas_KeepSubdividedBlocksWithinTheClientBudget()
    {
        foreach (var (seed, influence) in new[] { (7, 0.1), (23, 0.4), (11, 0.7), (23, 0.95), (99, 0.55) })
        {
            var count = Make(seed, influence).Grid.ToFrame(-1).Fine.Count;
            Assert.IsLessThan(650, count, $"seed {seed} influence {influence}: {count} subdivided blocks cost the client a long first paint");
        }
    }

    [TestMethod]
    public void Roads_RunThroughTwoOrThreeFlatOpenFields()
    {
        for (var seed = 0; seed < 60; seed++)
        {
            var recipe = Make(seed, 0.1);
            Assert.IsInRange(2, 3, recipe.Fields.Count, $"seed {seed}");
            foreach (var field in recipe.Fields)
            {
                Assert.IsTrue(recipe.OpenCells[field.Row * Columns + field.Column], $"seed {seed}: the field is centred on open ground");
                var area = 0;
                for (var row = 0; row < Rows; row++)
                    for (var column = 0; column < Columns; column++)
                    {
                        if (!recipe.OpenCells[row * Columns + column]) continue;
                        Assert.AreNotEqual(ArenaTerrainMaterial.Wood, recipe.Grid.Material(column, row), $"seed {seed}: no tree in a field");
                        Assert.AreNotEqual(ArenaTerrainMaterial.Boulder, recipe.Grid.Material(column, row), $"seed {seed}: no rock in a field");
                        if (Math.Sqrt(Dist2(column - field.Column, row - field.Row)) <= field.Radius * .8)
                        {
                            area++;
                            Assert.AreEqual(0, recipe.Grid.Surface(column, row), $"seed {seed}: a field is flat");
                        }
                    }
                Assert.IsGreaterThan(40, area, $"seed {seed}: room to fight and move");
            }
            // The road really passes through each field.
            foreach (var field in recipe.Fields)
                Assert.IsTrue(recipe.ProtectedRoute.Any(cell => Math.Sqrt(Dist2(cell.Column - field.Column, cell.Row - field.Row)) <= field.Radius), $"seed {seed}: the road meets its field");
        }
    }

    [TestMethod]
    public void Scenery_StandsWhereItsZoneSaysSoInsteadOfScatteredEverywhere()
    {
        int trees = 0, treesInForest = 0, cliffs = 0, cliffsInHighland = 0, hills = 0, hillsInMeadow = 0;
        for (var seed = 0; seed < 40; seed++)
        {
            var recipe = Make(seed, 0.1);
            foreach (var cell in Cells(recipe.Grid))
            {
                var zone = recipe.Zones[cell.Row * Columns + cell.Column];
                if (cell.Material == ArenaTerrainMaterial.Wood) { trees++; if (zone == ArenaZone.Forest || cell.Column < 2 || cell.Column >= Columns - 2) treesInForest++; }
                if (cell.Material == ArenaTerrainMaterial.Stone && cell.Surface >= 8) { cliffs++; if (zone is ArenaZone.Highland or ArenaZone.Meadow) cliffsInHighland++; }
                if (cell.Material == ArenaTerrainMaterial.Soil && cell.Surface > 0) { hills++; if (zone == ArenaZone.Meadow) hillsInMeadow++; }
            }
        }
        Assert.IsGreaterThan(40 * 20, trees, "woodland, not a handful of trees");
        Assert.IsGreaterThan(trees * .9, treesInForest);
        Assert.IsGreaterThan(40 * 30, cliffs);
        Assert.IsGreaterThan(cliffs * .95, cliffsInHighland);
        Assert.IsGreaterThan(hills * .75, hillsInMeadow, "rolling ground belongs to the meadows; the rest is slope blended off a cliff foot");
    }

    [TestMethod]
    public void Woodland_GathersInMassesAroundGladesAndLeavesTheRoadSideOpen()
    {
        for (var seed = 0; seed < 30; seed++)
        {
            var recipe = Make(seed, 0.1);
            var trunks = Cells(recipe.Grid).Where(cell => cell.Material == ArenaTerrainMaterial.Wood && recipe.Zones[cell.Row * Columns + cell.Column] == ArenaZone.Forest).ToList();
            Assert.IsGreaterThanOrEqualTo(15, trunks.Count, $"seed {seed}");
            // Masses: most trunks have another within three columns; a random scatter would leave many alone.
            var gathered = trunks.Count(t => trunks.Any(o => o != t && Math.Abs(o.Column - t.Column) <= 3 && Math.Abs(o.Row - t.Row) <= 3));
            Assert.IsGreaterThan(trunks.Count * .8, gathered, $"seed {seed}: trees stand in groves");
            foreach (var t in trunks)
                foreach (var o in new[] { (1, 0), (-1, 0), (0, 1), (0, -1) })
                    if (recipe.Grid.Contains(t.Column + o.Item1, t.Row + o.Item2)) Assert.AreNotEqual(ArenaTerrainMaterial.Wood, recipe.Grid.Material(t.Column + o.Item1, t.Row + o.Item2), $"seed {seed}: trunks never touch, so a forest can be walked");
        }
    }

    [TestMethod]
    public void TheRoad_HasACentreLineFromSpawnToExitAndTorchesBesideIt()
    {
        for (var seed = 0; seed < 30; seed++)
        {
            var recipe = Make(seed, 0.1);
            var road = recipe.Grid.Road;
            Assert.IsGreaterThanOrEqualTo(80, road.Count, $"seed {seed}: a smooth centre line");
            Assert.IsLessThan(3.0, Math.Sqrt(Dist2(road[0] / 16.0 - 16.5, road[1] / 16.0 - 52.5)), $"seed {seed}: starts at the spawn");
            Assert.IsLessThan(3.0, Math.Sqrt(Dist2(road[^2] / 16.0 - 16.5, road[^1] / 16.0 - 6.5)), $"seed {seed}: ends at the exit");
            var torches = recipe.Grid.Torches;
            Assert.IsGreaterThanOrEqualTo(8, torches.Count, $"seed {seed}: at least four torches");
            for (var i = 0; i < torches.Count; i += 2)
            {
                var (column, row) = (torches[i] / 16, torches[i + 1] / 16);
                Assert.IsFalse(recipe.ProtectedCells[row * Columns + column], $"seed {seed}: a torch never stands on the road corridor");
                Assert.AreEqual(0, recipe.Grid.Surface(column, row), $"seed {seed}: on level ground");
                Assert.AreNotEqual(ArenaTerrainMaterial.Wood, recipe.Grid.Material(column, row));
                var nearest = Enumerable.Range(0, road.Count / 2).Min(p => Math.Sqrt(Dist2(road[p * 2] / 16.0 - torches[i] / 16.0, road[p * 2 + 1] / 16.0 - torches[i + 1] / 16.0)));
                Assert.IsInRange(2.4, 6.5, nearest, $"seed {seed}: beside the road, not on it and not far from it");
            }
        }
    }

    [TestMethod]
    public void Torches_LightTheNearestStretchOfRoadAndTravelOnlyWithTheFirstFrame()
    {
        var grid = Make(7, 0.1).Grid;
        var first = new Vector2D(grid.Torches[0] / 16.0 * ArenaTerrainGrid.CellUnits, grid.Torches[1] / 16.0 * ArenaTerrainGrid.CellUnits);
        var lights = Wyrmforge.Application.Runs.Simulation.Lighting.TerrainLightingProjection.Capture(grid, first)
            .Where(light => light.Id.StartsWith("terrain:torch:", StringComparison.Ordinal)).ToList();
        Assert.HasCount(3, lights, "only the nearest few torches are emitted, inside the mobile light budget");
        Assert.IsTrue(lights.Any(light => light.Id == "terrain:torch:0"), "the torch beside the hunter is lit");
        Assert.IsTrue(lights.All(light => !light.CastsShadows));
        Assert.IsNotNull(grid.ToFrame(-1).Road);
        Assert.IsNotNull(grid.ToFrame(-1).Torches);
        Assert.IsNull(grid.ToFrame(3).Road, "later frames never resend the road");
    }

    [TestMethod]
    public void Knolls_AreGrassCappedStoneHillsWithARampOnOneSide()
    {
        var withKnoll = 0;
        for (var seed = 0; seed < 40; seed++)
        {
            var recipe = Make(seed, 0.1);
            var rock = Cells(recipe.Grid).Where(cell => cell.Material == ArenaTerrainMaterial.Stone && cell.Surface >= 8 && recipe.Zones[cell.Row * Columns + cell.Column] == ArenaZone.Meadow).ToList();
            if (rock.Count == 0) continue;
            withKnoll++;
            Assert.IsTrue(rock.Any(cell => new[] { (1, 0), (-1, 0), (0, 1), (0, -1) }.Any(o => recipe.Grid.Contains(cell.Column + o.Item1, cell.Row + o.Item2)
                && recipe.Grid.Material(cell.Column + o.Item1, cell.Row + o.Item2) == ArenaTerrainMaterial.Stone && recipe.Grid.Surface(cell.Column + o.Item1, cell.Row + o.Item2) is > 0 and <= ArenaTerrainGrid.MaxStepMicrocells)),
                $"seed {seed}: a knoll has a ramp foot a hunter can climb from");
        }
        Assert.IsGreaterThan(20, withKnoll, "most meadows hold a knoll");
    }

    [TestMethod]
    public void RockSteps_AreWholeHalfMetreMultiplesAndOnlyClimbableByRamp()
    {
        var recipe = Make(7, 0);
        var grid = recipe.Grid;
        Assert.IsTrue(Cells(grid).Any(cell => cell.Surface >= 8), "natural arenas offer raised cover");
        // Whole columns step in half-metre multiples; a rim that weathering chipped into microcolumns averages between them.
        Assert.IsTrue(Cells(grid).Where(cell => cell.Material == ArenaTerrainMaterial.Stone && !grid.IsSubdivided(cell.Column, cell.Row))
            .All(cell => cell.Surface % ArenaTerrainGrid.MaxStepMicrocells == 0));
        var sheer = Cells(grid).First(cell => cell.Surface >= 8 && HasLowerSheerNeighbour(grid, cell.Column, cell.Row, cell.Surface));
        var lower = new[] { (1, 0), (-1, 0), (0, 1), (0, -1) }
            .Select(offset => (Column: sheer.Column + offset.Item1, Row: sheer.Row + offset.Item2))
            .First(cell => grid.Contains(cell.Column, cell.Row) && sheer.Surface - grid.Surface(cell.Column, cell.Row) > ArenaTerrainGrid.MaxStepMicrocells);
        Assert.IsTrue(grid.BlocksMovement(ArenaTerrainGrid.CenterOf(lower.Column, lower.Row),
            ArenaTerrainGrid.CenterOf(sheer.Column, sheer.Row), 4), "a sheer face cannot be climbed");
    }

    [TestMethod]
    public void Movement_StopsAtSheerStepsAndPitsButSlidesAlongThem()
    {
        var grid = new ArenaTerrainGrid(8, 8);
        for (var row = 0; row < 8; row++)
        {
            grid.Set(4, row, 16, ArenaTerrainMaterial.Stone);
            grid.Set(5, row, -16, ArenaTerrainMaterial.Stone);
        }
        var start = ArenaTerrainGrid.CenterOf(2, 4);
        var wall = ArenaTerrainGrid.CenterOf(4, 4);
        Assert.IsTrue(grid.BlocksMovement(start, wall, PlayerRadius), "a 2 m step cannot be climbed");
        var pushed = grid.RestrictMovement(start, new Vector2D(start.X + 200, start.Y + 40), PlayerRadius);
        Assert.IsLessThan(4 * ArenaTerrainGrid.CellUnits, pushed.X);
        Assert.IsGreaterThan(start.Y, pushed.Y, "movement slides along the wall");
        Assert.IsTrue(grid.BlocksMovement(ArenaTerrainGrid.CenterOf(6, 4), ArenaTerrainGrid.CenterOf(5, 4), PlayerRadius),
            "a 2 m drop cannot be stepped into");
    }

    [TestMethod]
    public void Movement_ClimbsHalfMetreStepsAndRejectsLavaAndTheArenaEdge()
    {
        var grid = new ArenaTerrainGrid(8, 4);
        grid.Set(3, 1, 4, ArenaTerrainMaterial.Stone);
        grid.Set(5, 1, 0, ArenaTerrainMaterial.Lava);
        Assert.IsFalse(grid.BlocksMovement(ArenaTerrainGrid.CenterOf(2, 1), ArenaTerrainGrid.CenterOf(3, 1), PlayerRadius));
        Assert.IsTrue(grid.BlocksMovement(ArenaTerrainGrid.CenterOf(4, 1), ArenaTerrainGrid.CenterOf(5, 1), PlayerRadius));
        Assert.IsFalse(grid.IsStandable(new Vector2D(-5, 20), PlayerRadius));
        Assert.AreEqual(.5, grid.SurfaceMetersAt(ArenaTerrainGrid.CenterOf(3, 1)));
        Assert.IsNull(grid.SurfaceMetersAt(new Vector2D(-1, 0)));
    }

    [TestMethod]
    public void Sight_PassesOverPitsAndLowStepsButNotRockAboveAMetreAndAQuarter()
    {
        var grid = new ArenaTerrainGrid(12, 4);
        grid.Set(3, 1, -24, ArenaTerrainMaterial.Stone);
        grid.Set(5, 1, 8, ArenaTerrainMaterial.Stone);
        grid.Set(8, 1, 16, ArenaTerrainMaterial.Stone);
        var shooter = ArenaTerrainGrid.CenterOf(1, 1);
        Assert.IsFalse(grid.BlocksSight(shooter, ArenaTerrainGrid.CenterOf(4, 1)), "a pit does not block a shot");
        Assert.IsFalse(grid.BlocksSight(shooter, ArenaTerrainGrid.CenterOf(6, 1)), "a 1 m rock is below 1.25 m");
        Assert.IsTrue(grid.BlocksSight(shooter, ArenaTerrainGrid.CenterOf(10, 1)), "a 2 m rock blocks sight");
        Assert.IsFalse(grid.BlocksSight(ArenaTerrainGrid.CenterOf(8, 1), ArenaTerrainGrid.CenterOf(10, 1)),
            "standing on the rock, ground one step lower does not block");
    }

    [TestMethod]
    public void RandomWalks_NeverEndInsideAnUnstandableFootprint()
    {
        for (var seed = 0; seed < 40; seed++)
        {
            var recipe = Make(seed, .7 + seed % 4 * .1);
            var grid = recipe.Grid;
            var position = ArenaTerrainGrid.CenterOf(Spawn.Column, Spawn.Row);
            var rng = new Random(seed);
            for (var step = 0; step < 1500; step++)
            {
                var angle = rng.NextDouble() * Math.PI * 2;
                var proposed = position + new Vector2D(Math.Cos(angle), Math.Sin(angle)) * 18;
                position = grid.RestrictMovement(position, proposed, PlayerRadius);
                Assert.IsTrue(grid.IsStandable(position, PlayerRadius), $"seed {seed} step {step}");
            }
        }
    }

    [TestMethod]
    public void ReachableFrom_MatchesPointToPointReachability()
    {
        var recipe = Make(3, .7);
        var reachable = recipe.Grid.ReachableFrom(Spawn, PlayerRadius);
        Assert.IsTrue(reachable[Exit.Row * Columns + Exit.Column]);
        Assert.IsTrue(reachable[Spawn.Row * Columns + Spawn.Column]);
        for (var row = 0; row < Rows; row += 7)
            for (var column = 0; column < Columns; column += 5)
                Assert.AreEqual(reachable[row * Columns + column], recipe.Grid.IsReachable(Spawn, (column, row), PlayerRadius), $"{column},{row}");
    }

    [TestMethod]
    public void DistanceField_RoutesAroundSheerRockAndNeverThroughIt()
    {
        var grid = new ArenaTerrainGrid(12, 8);
        for (var row = 0; row < 6; row++) grid.Set(5, row, 24, ArenaTerrainMaterial.Stone);
        var goal = (Column: 9, Row: 1);
        var cost = grid.DistanceFrom(goal, PlayerRadius);
        var start = ArenaTerrainGrid.CenterOf(2, 1);
        Assert.IsTrue(grid.BlocksMovement(start, ArenaTerrainGrid.CenterOf(goal.Column, goal.Row), PlayerRadius), "the wall is in the way");
        var position = start;
        for (var step = 0; step < 60 && ArenaTerrainGrid.ColumnOf(position) != goal; step++)
        {
            var waypoint = grid.NextWaypoint(cost, position, PlayerRadius, 4);
            Assert.IsNotNull(waypoint, $"step {step}");
            var next = grid.RestrictMovement(position, position + (waypoint.Value - position).Normalized() * 10, PlayerRadius);
            Assert.AreNotEqual(position, next, $"step {step}: a chaser following the field must keep moving");
            position = next;
        }
        Assert.AreEqual(goal, ArenaTerrainGrid.ColumnOf(position));
        Assert.AreEqual(ArenaTerrainGrid.Unreachable, grid.DistanceFrom((5, 2), PlayerRadius)[1 * 12 + 1], "a rock column is not a goal anyone can reach");
    }

    [TestMethod]
    public void DistanceField_ClimbsRampsAndStopsAtPits()
    {
        var grid = new ArenaTerrainGrid(10, 3);
        for (var column = 0; column < 10; column++) grid.Set(column, 1, Math.Min(column, 5) * 4, ArenaTerrainMaterial.Stone);
        grid.Set(8, 0, -24, ArenaTerrainMaterial.Lava);
        var cost = grid.DistanceFrom((9, 1), PlayerRadius);
        Assert.AreNotEqual(ArenaTerrainGrid.Unreachable, cost[1 * 10 + 0], "a half-metre ramp can be climbed from the floor");
        Assert.AreEqual(ArenaTerrainGrid.Unreachable, cost[0 * 10 + 8], "lava is never a route");
    }

    [TestMethod]
    public void Revision_AdvancesOnlyWhenTerrainChanges()
    {
        var grid = new ArenaTerrainGrid(4, 4);
        var before = grid.Revision;
        _ = grid.Surface(1, 1);
        Assert.AreEqual(before, grid.Revision);
        grid.Set(1, 1, 8, ArenaTerrainMaterial.Stone);
        Assert.AreEqual(before + 1, grid.Revision);
    }

    private static IEnumerable<(int Column, int Row, int Surface, ArenaTerrainMaterial Material)> Cells(ArenaTerrainGrid grid)
    {
        for (var row = 0; row < grid.Rows; row++)
            for (var column = 0; column < grid.Columns; column++)
                yield return (column, row, grid.Surface(column, row), grid.Material(column, row));
    }

    private static bool HasLowerSheerNeighbour(ArenaTerrainGrid grid, int column, int row, int surface) =>
        new[] { (1, 0), (-1, 0), (0, 1), (0, -1) }.Any(offset =>
            grid.Contains(column + offset.Item1, row + offset.Item2) &&
            surface - grid.Surface(column + offset.Item1, row + offset.Item2) > ArenaTerrainGrid.MaxStepMicrocells);

    private static bool HasSheerNeighbour(ArenaTerrainGrid grid, int column, int row) =>
        new[] { (1, 0), (-1, 0), (0, 1), (0, -1) }.Any(offset =>
            grid.Contains(column + offset.Item1, row + offset.Item2) &&
            Math.Abs(grid.Surface(column, row) - grid.Surface(column + offset.Item1, row + offset.Item2)) > ArenaTerrainGrid.MaxStepMicrocells);
}
