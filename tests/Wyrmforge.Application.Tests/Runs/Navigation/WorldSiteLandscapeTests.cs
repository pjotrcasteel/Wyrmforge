using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;

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
    public void MobileStartingCamera_ShowsPhysicalForestAndMountainFeatures_NotOnlyFlatSubstrate()
    {
        var observations = new Dictionary<string, int>(StringComparer.Ordinal)
        {
            ["forest-fork"] = 0,
            ["mountain-pass"] = 0,
        };
        for (var seed = 0; seed < 100; seed++)
        {
            foreach (var node in WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Wyrm))
            {
                var site = node.Geography!;
                if (!observations.ContainsKey(site.Landscape!.Kind)) continue;
                if (site.Landscape.Obstacles.Any(obstacle =>
                    obstacle.Outline.Any(point => point.X is > .30 and < .70 && point.Y is > .27 and < .73)))
                    observations[site.Landscape.Kind]++;
            }
        }
        Assert.IsGreaterThan(20, observations["forest-fork"],
            "Genuine forest forks need legible C# roots near the mobile player's starting camera.");
        Assert.IsGreaterThan(20, observations["mountain-pass"],
            "Mountain approaches need a visible C# cliff silhouette at ordinary mobile scale.");
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
            Assert.AreEqual(normalSnapshot.Geography!.SiteId, physicalSnapshot.Geography!.SiteId);
            CollectionAssert.AreEqual(normalSnapshot.Geography.Ports.ToArray(), physicalSnapshot.Geography.Ports.ToArray());
            Assert.IsNull(normalSnapshot.Geography.Landscape);
            Assert.IsNotNull(physicalSnapshot.Geography.Landscape);
            Assert.AreEqual(normalSnapshot.Supplies.Count, physicalSnapshot.Supplies.Count);
            Assert.IsTrue(normalSnapshot.Props.All(prop => prop.Kind is "barrel" or "crate"));
            Assert.IsTrue(physicalSnapshot.Props.All(prop => prop.Kind is "barrel" or "crate"),
                "The preview must retain only existing C#-authorized destructible salvage.");

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
    public void WorldFirstSpawnRepair_NeverPlacesAnEnemyBehindItsOwnImpassableCliffOrRoot()
    {
        const double width = 950, height = 1550;
        var found = 0;
        for (var seed = 0; seed < 20; seed++)
        {
            var node = WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Wyrm)
                .Single(candidate => candidate.Stage == 1);
            var environment = ArenaEnvironmentState.Create(seed, node, worldFirstGeography: true);
            var hunter = new Vector2D(width * .5, height * .5);
            foreach (var requested in new[]
            {
                new Vector2D(width * .2, height * .14),
                new Vector2D(width * .8, height * .23),
                new Vector2D(width * .28, height * .79),
            })
            {
                var spawn = environment.AdjustSpawnPosition(requested, hunter, width, height, 12);
                if (spawn is not { } safe) continue;
                found++;
                Assert.IsFalse(environment.IsBlocked(safe, width, height, 12));
                Assert.IsFalse(environment.BlocksSegment(safe, hunter, width, height, 12));
                Assert.IsGreaterThanOrEqualTo(ArenaEnvironmentState.MinimumSpawnDistance + 12,
                    Vector2D.Distance(safe, hunter));
            }
        }
        Assert.IsGreaterThan(0, found, "At least some legal and reachable spawns must survive the geography.");
    }

    [TestMethod]
    public void FireAndFrostLairs_HaveDifferentAuthoritativeGeologyAndPhysicalLandmarks()
    {
        var fire = WyrmrealmMapGenerator.Generate(1, 1204, SpellSchool.Fire)
            .Single(node => node.Type == WyrmrealmNodeType.Dragon).Geography!;
        var frost = WyrmrealmMapGenerator.Generate(1, 1204, SpellSchool.Frost)
            .Single(node => node.Type == WyrmrealmNodeType.Dragon).Geography!;
        Assert.AreEqual("wyrm-lair", fire.Landscape!.Kind);
        Assert.AreEqual("wyrm-lair", frost.Landscape!.Kind);
        Assert.AreEqual(WorldSiteSurfaceId.Rock, fire.Substrate.Material);
        Assert.AreEqual(WorldSiteSurfaceId.GlacialIce, frost.Substrate.Material);
        CollectionAssert.Contains(fire.MandatoryLandmarks.ToArray(), "ashen-spine");
        CollectionAssert.Contains(frost.MandatoryLandmarks.ToArray(), "glacier-throne");
        Assert.IsTrue(fire.Landscape.Obstacles.All(obstacle => obstacle.Kind == "wyrm-rib"));
        Assert.IsTrue(frost.Landscape.Obstacles.All(obstacle => obstacle.Kind == "ice-spire"));
        Assert.AreEqual(fire.Ports.Count, frost.Ports.Count);
    }

    [TestMethod]
    public void FireAndFrostLairs_PreserveBossTelegraphAndApproachCorridor()
    {
        const double width = 950;
        const double height = 1550;
        var bossCenter = new Vector2D(width * .5, height * .5);
        foreach (var region in new[] { SpellSchool.Fire, SpellSchool.Frost })
        {
            for (var seed = 0; seed < 24; seed++)
            {
                var lair = WyrmrealmMapGenerator.Generate(1, seed, region)
                    .Single(node => node.Type == WyrmrealmNodeType.Dragon).Geography!;
                var landscape = lair.Landscape!;
                Assert.AreEqual("wyrm-lair", landscape.Kind);
                Assert.IsGreaterThan(2, landscape.Obstacles.Count,
                    "A Wyrm lair must have physical rock or ice beyond an empty clearing.");
                Assert.IsFalse(landscape.Obstacles.Any(obstacle =>
                    WorldSiteFootprintCollision.Contains(obstacle, bossCenter, width, height, radius: 95)),
                    "No authoritative rock/ice footprint may encroach on the boss telegraph envelope.");
                foreach (var corridor in lair.Corridors)
                {
                    Assert.IsFalse(WorldSiteFootprintCollision.BlocksSegment(landscape,
                        new Vector2D(corridor.Points[0].X * width, corridor.Points[0].Y * height),
                        new Vector2D(corridor.Points[^1].X * width, corridor.Points[^1].Y * height),
                        width, height, radius: 12),
                        $"Region {region}, seed {seed}: the lair entry must stay traversable.");
                }
            }
        }
    }

    [TestMethod]
    public void ScenicForestForks_AreGeneratedIndependentlyOfChartBranches()
    {
        var forests = Enumerable.Range(0, 100)
            .SelectMany(seed => WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Ascendant))
            .Where(node => node.Geography?.Landscape?.Kind == "forest-fork")
            .ToArray();
        Assert.IsGreaterThan(0, forests.Length);
        Assert.IsTrue(forests.Any(node => node.Geography!.Ports.Count(port => !port.Entrance) < 2),
            "A visible forest fork must be possible even without a Chart graph fork.");
        foreach (var node in forests)
        {
            var site = node.Geography!;
            Assert.AreEqual(2, site.ScenicPaths.Count);
            Assert.IsTrue(site.ScenicPaths.All(path => site.Ports.All(port => port.EdgeId != path.EdgeId)),
                "Visible paths must be local generation, not copies of graph edges.");
            Assert.AreEqual(site.Ports.Count, site.Ports.Select(port => port.EdgeId).Distinct().Count());
        }
    }

    [TestMethod]
    public void MountainMonastery_CreatesRealHallWallsAndWalkableCourtyardFromNodeMetadata()
    {
        var mountainMonastery = Enumerable.Range(0, 150)
            .SelectMany(seed => WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Ascendant))
            .First(node => node.GenerationProfile is
            {
                Landform: WorldSiteLandform.Mountain,
                Landmark: WorldSiteLandmark.Monastery,
            });
        var site = mountainMonastery.Geography!;
        Assert.AreEqual("mountain-monastery", site.Landscape!.Kind);
        Assert.AreEqual(WorldSiteLandmark.Monastery, site.GenerationProfile!.Landmark);
        Assert.AreEqual(1, site.Landscape.Obstacles.Count(obstacle => obstacle.Kind == "monastery-hall"));
        Assert.AreEqual(5, site.Landscape.Obstacles.Count(obstacle => obstacle.Kind == "monastery-wall"));
        const double width = 950, height = 1550;
        var hall = site.Landscape.Obstacles.Single(obstacle => obstacle.Kind == "monastery-hall");
        var centroid = new Vector2D(hall.Outline.Average(point => point.X) * width,
            hall.Outline.Average(point => point.Y) * height);
        Assert.IsTrue(WorldSiteFootprintCollision.Contains(hall, centroid, width, height));
        foreach (var corridor in site.Corridors)
            Assert.IsFalse(WorldSiteFootprintCollision.BlocksSegment(site.Landscape,
                new Vector2D(corridor.Points[0].X * width, corridor.Points[0].Y * height),
                new Vector2D(corridor.Points[^1].X * width, corridor.Points[^1].Y * height),
                width, height, radius: 12));
    }
}
