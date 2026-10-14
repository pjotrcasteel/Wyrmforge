using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class EnvironmentDistrictTests
{
    [TestMethod]
    public void Create_AdjacentNodes_UseDifferentDistrictsInSameBiome()
    {
        const int seed = 1204;
        var nodes = WyrmrealmMapGenerator.Generate(1, seed);
        var first = nodes.Single(node => node.Stage == 1);
        var second = nodes.Single(node => node.Stage == 2);
        var starting = ArenaEnvironmentState.Create(seed, first).Snapshot();
        var following = ArenaEnvironmentState.Create(seed, second).Snapshot();

        Assert.AreEqual(starting.Biome, following.Biome);
        Assert.AreNotEqual(starting.District, following.District);
        CollectionAssert.Contains(new[] { "causeway", "sanctuary", "rift" }, starting.District);
        CollectionAssert.Contains(new[] { "causeway", "sanctuary", "rift" }, following.District);
    }

    [TestMethod]
    public void Create_DistrictDifferent_ChangesRealCrossingGeometryWithoutBlockingMiddle()
    {
        var nodes = WyrmrealmMapGenerator.Generate(1, 1204);
        var first = ArenaEnvironmentState.Create(1204, nodes.Single(node => node.Stage == 1));
        var second = ArenaEnvironmentState.Create(1204, nodes.Single(node => node.Stage == 2));
        var firstGate = first.Snapshot().Barriers.First(barrier => barrier.Kind == "gate");
        var secondGate = second.Snapshot().Barriers.First(barrier => barrier.Kind == "gate");

        Assert.AreNotEqual(firstGate.Width, secondGate.Width);
        Assert.AreEqual(.5, firstGate.X + firstGate.Width / 2, .00001);
        Assert.AreEqual(.5, secondGate.X + secondGate.Width / 2, .00001);
        Assert.IsTrue(first.IsBlocked(new Wyrmforge.Domain.Combat.Geometry.Vector2D(950 * .5, 2100 * firstGate.Y), 950, 2100, 14));
        Assert.IsTrue(second.IsBlocked(new Wyrmforge.Domain.Combat.Geometry.Vector2D(950 * .5, 2100 * secondGate.Y), 950, 2100, 14));
    }
}
