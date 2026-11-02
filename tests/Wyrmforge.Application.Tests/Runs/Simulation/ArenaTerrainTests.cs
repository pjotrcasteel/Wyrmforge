using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class ArenaTerrainTests
{
    private const int Columns = 32;
    private const int Rows = 60;
    private const double PlayerRadius = 12;
    private static readonly (int Column, int Row) Spawn = (16, 30);
    private static readonly (int Column, int Row) Exit = (16, 6);

    private static ArenaTerrainRecipe Make(int seed, double influence) =>
        ArenaTerrainGenerator.Generate(seed, influence, Columns, Rows, Spawn, Exit);

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
    public void Influence_ControlsFissuresAndLava()
    {
        for (var seed = 0; seed < 200; seed++)
        {
            Assert.IsFalse(Cells(Make(seed, .3).Grid).Any(cell => cell.Surface < 0), $"seed {seed}: no pits in a natural forest");
            var burning = Cells(Make(seed, .7).Grid).ToArray();
            Assert.IsTrue(burning.Any(cell => cell.Surface <= -16), $"seed {seed}: burning land is split by fissures");
            Assert.IsFalse(burning.Any(cell => cell.Material == ArenaTerrainMaterial.Lava), $"seed {seed}: lava belongs to the domain");
            Assert.IsTrue(Cells(Make(seed, 1).Grid).Any(cell => cell.Material == ArenaTerrainMaterial.Lava), $"seed {seed}");
        }
    }

    [TestMethod]
    public void RockSteps_AreWholeHalfMetreMultiplesAndOnlyClimbableByRamp()
    {
        var recipe = Make(7, 0);
        var grid = recipe.Grid;
        Assert.IsTrue(Cells(grid).Any(cell => cell.Surface >= 8), "natural arenas offer raised cover");
        Assert.IsTrue(Cells(grid).All(cell => cell.Surface % ArenaTerrainGrid.MaxStepMicrocells == 0));
        var sheer = Cells(grid).First(cell => cell.Surface >= 8 && HasSheerNeighbour(grid, cell.Column, cell.Row));
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

    private static bool HasSheerNeighbour(ArenaTerrainGrid grid, int column, int row) =>
        new[] { (1, 0), (-1, 0), (0, 1), (0, -1) }.Any(offset =>
            grid.Contains(column + offset.Item1, row + offset.Item2) &&
            Math.Abs(grid.Surface(column, row) - grid.Surface(column + offset.Item1, row + offset.Item2)) > ArenaTerrainGrid.MaxStepMicrocells);
}
