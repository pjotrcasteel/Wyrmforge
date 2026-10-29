using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WorldSiteLandscapeTests
{
    [TestMethod]
    public void FireHunt_HasRealForestForkMountainPassAndWyrmLairAcrossWorldSeeds()
    {
        var kinds = new HashSet<string>(StringComparer.Ordinal);
        for (var seed = 0; seed < 80; seed++)
        {
            var nodes = WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Wyrm);
            foreach (var node in nodes)
                kinds.Add(node.Geography!.Landscape!.Kind);
            Assert.AreEqual("wyrm-lair", nodes.Single(node => node.Type == WyrmrealmNodeType.Dragon).Geography!.Landscape!.Kind);
        }
        CollectionAssert.IsSubsetOf(new[] { "forest-fork", "mountain-pass", "wyrm-lair" }, kinds.ToArray());
    }

    [TestMethod]
    public void OneAuthoritativeMapSeed_ReproducesIdenticalPhysicalFootprintsAndChartPorts()
    {
        foreach (var seed in new[] { 0, 1, 3, 1204, 81039 })
        {
            var first = WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Ascendant);
            var repeated = WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Ascendant);
            Assert.AreEqual(JsonSerializer.Serialize(first), JsonSerializer.Serialize(repeated));
            foreach (var site in first)
            {
                Assert.AreEqual(site.Site!.Point, site.Geography!.ChartCenter);
                Assert.AreEqual(site.Geography.Ports.Count, site.Geography.Corridors.Count);
                Assert.IsTrue(site.Geography.Landscape!.Obstacles.All(obstacle => obstacle.Outline.Count >= 3));
                foreach (var obstacle in site.Geography.Landscape.Obstacles)
                {
                    Assert.IsTrue(obstacle.Outline.All(point =>
                        point.X > 0 && point.X < 1 && point.Y > 0 && point.Y < 1),
                        $"seed {seed} site {site.Id}: silhouette outside physical world");
                }
            }
        }
    }

    [TestMethod]
    public void PhysicalCorridors_StayWalkableFromCenterToEveryMappedExit()
    {
        const double width = 950, height = 1550;
        for (var seed = 0; seed < 36; seed++)
        {
            var nodes = WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Wyrm);
            foreach (var node in nodes)
            {
                var site = node.Geography!;
                var layout = site.Landscape!;
                foreach (var corridor in site.Corridors)
                {
                    var from = new Vector2D(width * corridor.Points[0].X, height * corridor.Points[0].Y);
                    var to = new Vector2D(width * corridor.Points[^1].X, height * corridor.Points[^1].Y);
                    Assert.IsFalse(WorldSiteFootprintCollision.BlocksSegment(layout, from, to, width, height, radius: 12),
                        $"seed {seed}, {site.SiteId}, {corridor.EdgeId}: an authored terrain obstacle blocks its own chart road");
                }
            }
        }
    }

    [TestMethod]
    public void PreviewMode_CollidesWithExactlyTheRenderSnapshotFootprints_WithoutChangingNormalHunts()
    {
        const double width = 950, height = 1550;
        var nodes = WyrmrealmMapGenerator.GenerateFireHunt(1204, WyrmTier.Wyrm);
        foreach (var node in nodes)
        {
            var normal = ArenaEnvironmentState.Create(1204, node);
            var physical = ArenaEnvironmentState.Create(1204, node, worldFirstGeography: true);
            var normalSnapshot = normal.Snapshot();
            var physicalSnapshot = physical.Snapshot();
            Assert.IsFalse(normalSnapshot.GeographyActive);
            Assert.IsTrue(physicalSnapshot.GeographyActive);
            Assert.AreEqual(JsonSerializer.Serialize(normalSnapshot.Geography),
                JsonSerializer.Serialize(physicalSnapshot.Geography));
            Assert.AreEqual(normalSnapshot.Supplies.Count, physicalSnapshot.Supplies.Count);
            Assert.AreEqual(JsonSerializer.Serialize(normalSnapshot.Props),
                JsonSerializer.Serialize(physicalSnapshot.Props));

            foreach (var footprint in physicalSnapshot.Geography!.Landscape!.Obstacles)
            {
                var centroid = new Vector2D(footprint.Outline.Average(point => point.X) * width,
                    footprint.Outline.Average(point => point.Y) * height);
                Assert.IsTrue(WorldSiteFootprintCollision.Contains(footprint, centroid, width, height));
                Assert.IsTrue(physical.IsBlocked(centroid, width, height, radius: 5));
                Assert.IsTrue(physical.BlocksSegment(centroid, centroid + new Vector2D(40, 0), width, height, radius: 5),
                    "The same C# site geometry must obstruct projectiles and sight lines.");
            }
        }
    }

    [TestMethod]
    public void ForestFork_ExposesDistinctOutgoingGraphEdgesWithDirectionalPhysicalPorts()
    {
        var fork = Enumerable.Range(0, 100)
            .SelectMany(seed => WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Wyrm))
            .First(node => node.Geography?.Landscape?.Kind == "forest-fork");
        var site = fork.Geography!;
        var outgoing = site.Ports.Where(port => !port.Entrance).ToArray();
        Assert.IsGreaterThanOrEqualTo(2, outgoing.Length);
        Assert.AreEqual(outgoing.Length, outgoing.Select(port => port.EdgeId).Distinct().Count());
        Assert.AreEqual(outgoing.Length, outgoing.Select(port => port.LocalPoint).Distinct().Count(),
            "Two chart roads must not point to the same exit location.");
        foreach (var port in outgoing)
            Assert.IsTrue(site.Corridors.Any(c => c.EdgeId == port.EdgeId && c.Points[^1] == port.LocalPoint));
    }
}
