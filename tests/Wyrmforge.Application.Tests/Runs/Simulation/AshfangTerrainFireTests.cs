using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class AshfangTerrainFireTests
{
    [TestMethod]
    public void SurfaceFuel_OnlyOrganicSoilAndWoodCanCarryFire_AndMoistureIsStable()
    {
        var grid = SoilGrid();
        grid.SetFireMoistureSeed(143);
        grid.Set(1, 1, 0, ArenaTerrainMaterial.Ash);
        grid.Set(2, 1, 0, ArenaTerrainMaterial.Stone);
        grid.Set(3, 1, 0, ArenaTerrainMaterial.Lava);
        grid.Set(4, 1, 0, ArenaTerrainMaterial.Boulder);
        grid.Set(5, 1, 20, ArenaTerrainMaterial.Wood);

        foreach (var column in new[] { 1, 2, 3, 4 })
            Assert.AreEqual(AshfangFireFuel.Inert, AshfangFireFuelRules.At(grid, ArenaTerrainGrid.CenterOf(column, 1)));
        Assert.AreEqual(AshfangFireFuel.Wood, AshfangFireFuelRules.At(grid, ArenaTerrainGrid.CenterOf(5, 1)));
        Assert.IsTrue(AshfangFireFuelRules.CanSpread(AshfangFireFuel.Wood));
        Assert.IsFalse(AshfangFireFuelRules.CanSpread(AshfangFireFuel.DampOrganic));
        grid.Set(5, 1, 0, ArenaTerrainMaterial.Wood);
        Assert.AreEqual(AshfangFireFuel.Inert, AshfangFireFuelRules.At(grid, ArenaTerrainGrid.CenterOf(5, 1)),
            "A trunk cut down to its base should not carry ghost flames.");

        var point = ArenaTerrainGrid.CenterOf(4, 4);
        var fuel = AshfangFireFuelRules.At(grid, point);
        Assert.AreEqual(fuel, AshfangFireFuelRules.At(grid.Clone(), point), "Cloning the terrain must preserve physical moisture.");
        grid.Set(4, 4, -8, ArenaTerrainMaterial.Stone);
        Assert.AreEqual(AshfangFireFuel.Inert, AshfangFireFuelRules.At(grid, point),
            "Fire must stop at exposed stone and must not care about its original grass texture.");
    }

    [TestMethod]
    public void Spread_PropagatesOnlyTwoGenerations_WithoutMutatingTerrainTexturesOrVoxels()
    {
        var random = new SeededRandomSource(19);
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        var grid = SoilGrid();
        var origin = ArenaTerrainGrid.CenterOf(4, 4);
        var seed = Enumerable.Range(1, 1000).First(candidate =>
        {
            grid.SetFireMoistureSeed(candidate);
            return AshfangFireFuelRules.At(grid, origin) == AshfangFireFuel.DryOrganic;
        });
        grid.SetFireMoistureSeed(seed);

        var patches = (List<AshfangGroundFirePatch>)typeof(RunSimulation)
            .GetField("ashfangGroundFires", BindingFlags.Instance | BindingFlags.NonPublic)!
            .GetValue(simulation)!;
        patches.Add(new AshfangGroundFirePatch(1, origin));
        var revision = grid.Revision;

        patches[0].Advance(.75);
        InvokeSpread(simulation, grid);
        Assert.HasCount(2, patches, "One original fire should ignite exactly one neighbouring fuel source.");
        Assert.AreEqual(1, patches[^1].Generation);
        Assert.AreEqual(AshfangFireFuel.DryOrganic, patches[^1].Fuel);

        foreach (var patch in patches) patch.Advance(.75);
        InvokeSpread(simulation, grid);
        Assert.HasCount(3, patches, "The first generation can ignite one more neighbour.");
        Assert.AreEqual(2, patches[^1].Generation);

        for (var step = 0; step < 8; step++)
        {
            foreach (var patch in patches) patch.Advance(.75);
            InvokeSpread(simulation, grid);
        }

        Assert.HasCount(3, patches, "A two-generation flame front cannot become an uncontrolled forest fire.");
        Assert.AreEqual(revision, grid.Revision, "Fire is an independent physical hazard and must not trigger ground texture repaints.");
    }

    [TestMethod]
    public void Spread_CannotCrossRockOrSteepCliffs_ButCanIgniteTrunkAtItsBase()
    {
        var grid = SoilGrid();
        var source = ArenaTerrainGrid.CenterOf(2, 2);
        var target = ArenaTerrainGrid.CenterOf(3, 2);
        grid.Set(3, 2, 12, ArenaTerrainMaterial.Soil);
        Assert.IsFalse(AshfangFireFuelRules.CanCrossHeight(grid, source, target,
            AshfangFireFuel.DryOrganic, AshfangFireFuel.DryOrganic));
        grid.Set(3, 2, 20, ArenaTerrainMaterial.Wood);
        Assert.IsTrue(AshfangFireFuelRules.CanCrossHeight(grid, source, target,
            AshfangFireFuel.DryOrganic, AshfangFireFuel.Wood));
        grid.Set(3, 2, 32, ArenaTerrainMaterial.Wood);
        Assert.IsFalse(AshfangFireFuelRules.CanCrossHeight(grid, source, target,
            AshfangFireFuel.DryOrganic, AshfangFireFuel.Wood));
    }

    [TestMethod]
    public void DampSoilExtinguishesQuickly_AndWoodBurnsLongerThanOrdinaryGround()
    {
        var damp = new AshfangGroundFirePatch(1, Vector2D.Zero, AshfangFireFuel.DampOrganic);
        var wood = new AshfangGroundFirePatch(2, Vector2D.Zero, AshfangFireFuel.Wood);
        damp.Advance(1.2);
        wood.Advance(1.2);
        Assert.IsFalse(damp.Burning);
        Assert.IsTrue(wood.Burning);
        Assert.IsFalse(damp.ReadyToSpread);
        Assert.IsFalse(damp.Burns(Vector2D.Zero));
    }

    private static ArenaTerrainGrid SoilGrid()
    {
        var grid = new ArenaTerrainGrid(12, 12);
        for (var row = 0; row < grid.Rows; row++)
            for (var column = 0; column < grid.Columns; column++)
                grid.Set(column, row, 0, ArenaTerrainMaterial.Soil);
        return grid;
    }

    private static void InvokeSpread(RunSimulation simulation, ArenaTerrainGrid grid) =>
        typeof(RunSimulation).GetMethod("SpreadAshfangGroundFires", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(simulation, [grid]);
}
