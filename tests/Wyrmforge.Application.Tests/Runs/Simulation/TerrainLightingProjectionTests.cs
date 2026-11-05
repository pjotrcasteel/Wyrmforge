using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Lighting;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class TerrainLightingProjectionTests
{
    private static IReadOnlyList<LightingEmitter> Lava(ArenaTerrainGrid? grid, Vector2D focus) =>
        TerrainLightingProjection.Capture(grid, focus).Where(light => light.Id.StartsWith("terrain:lava:", StringComparison.Ordinal)).ToArray();

    private static ArenaTerrainGrid Volcanic(int seed, double influence = 1) =>
        ArenaTerrainGenerator.Generate(seed, influence, 32, 60, (16, 54), (16, 6)).Grid;

    [TestMethod]
    public void NoTerrain_OrNoLava_EmitsNothing()
    {
        Assert.AreEqual(0, TerrainLightingProjection.Capture(null, new Vector2D(0, 0)).Count);
        for (var seed = 0; seed < 8; seed++)
            Assert.AreEqual(0, Lava(Volcanic(seed, .1), new Vector2D(512, 960)).Count, $"seed {seed}: Wet Forest has no lava");
    }

    [TestMethod]
    public void VolcanicTerrain_GlowsFromAtMostFourStableClustersNearestTheHunter()
    {
        var lit = 0;
        for (var seed = 0; seed < 12; seed++)
        {
            var grid = Volcanic(seed);
            var near = Lava(grid, new Vector2D(512, 960));
            Assert.IsLessThanOrEqualTo(TerrainLightingProjection.MaxEmitters, near.Count);
            if (near.Count > 0) lit++;
            Assert.IsTrue(near.All(light => light.Id.StartsWith("terrain:lava:") && !light.CastsShadows && light.Intensity > 0));
            CollectionAssert.AreEqual(near.Select(light => light.Id).ToArray(),
                Lava(grid, new Vector2D(512, 960)).Select(light => light.Id).ToArray(), "deterministic");
            // The same cluster keeps the same id wherever the hunter stands, so it never flickers into a new light.
            var elsewhere = Lava(grid, new Vector2D(100, 100));
            foreach (var light in near.Where(light => elsewhere.Any(other => other.Id == light.Id)))
            {
                var other = elsewhere.Single(candidate => candidate.Id == light.Id);
                Assert.AreEqual(light.X, other.X);
                Assert.AreEqual(light.Y, other.Y);
            }
        }
        Assert.IsGreaterThan(0, lit, "Volcanic Devastation must contain lava glow");
    }
}
