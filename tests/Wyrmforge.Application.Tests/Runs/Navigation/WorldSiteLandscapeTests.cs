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
    public void Ar3ContinuousElevation_HighlandIsRaisedAndStableAcrossReplays()
    {
        var match = Enumerable.Range(0, 80)
            .Select(seed => (Seed: seed, Nodes: WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Elder)))
            .First(result => result.Nodes.Any(node => node.Geography?.Landscape?.Kind is "mountain-monastery" or "mountain-pass"));
        var mountain = match.Nodes.First(node => node.Geography?.Landscape?.Kind is "mountain-monastery" or "mountain-pass");
        var site = mountain.Geography!;
        var copy = WyrmrealmMapGenerator.GenerateFireHunt(match.Seed, WyrmTier.Elder)
            .Single(node => node.Id == mountain.Id).Geography!;
        var valley = WorldSiteElevationField.Sample(site, new HuntPoint(.5, .5));
        var ridge = WorldSiteElevationField.Sample(site, new HuntPoint(.08, .5));
        Assert.IsGreaterThan(valley.HeightMeters + .4, ridge.HeightMeters,
            "The actual C# height field must lift a mountain ridge above the low valley.");
        Assert.AreEqual(ridge, WorldSiteElevationField.Sample(copy, new HuntPoint(.08, .5)));
        var adjacent = WorldSiteElevationField.Sample(site, new HuntPoint(.0801, .5));
        Assert.IsLessThan(.15, Math.Abs(ridge.HeightMeters - adjacent.HeightMeters),
            "Terrain elevation must change continuously without hard polygon boundaries.");
        Assert.IsTrue(double.IsFinite(ridge.Grade));
        Assert.IsTrue(ridge.Grade >= 0);
    }

    [TestMethod]
    public void Ar3MaterialWeights_AreContinuousNormalizedAndFollowActualLocalTrails()
    {
        var node = WyrmrealmMapGenerator.GenerateFireHunt(1204, WyrmTier.Wyrm)
            .First(node => node.Type == WyrmrealmNodeType.Combat);
        var site = node.Geography!;
        var trail = site.ScenicPaths.Single();
        var center = trail.Points[trail.Points.Count / 2];
        var onTrail = WorldSiteElevationField.Sample(site, center);
        var offTrail = WorldSiteElevationField.Sample(site,
            new HuntPoint(Math.Clamp(center.X + .16, .01, .99), center.Y));
        Assert.IsGreaterThan(offTrail.RoadWeight, onTrail.RoadWeight,
            "Only physical, C#-authored local trails may create road material.");
        foreach (var sample in new[] { onTrail, offTrail, WorldSiteElevationField.Sample(site, new HuntPoint(.3, .71)) })
        {
            var total = sample.SoilWeight + sample.GrassWeight + sample.RoadWeight +
                sample.MudWeight + sample.RockWeight + sample.WaterWeight + sample.IceWeight;
            Assert.AreEqual(1, total, 1e-10);
            Assert.IsTrue(sample.Moisture is >= 0 and <= 1);
            Assert.IsTrue(double.IsFinite(sample.HeightMeters));
            Assert.IsTrue(double.IsFinite(sample.Grade));
        }
    }

    [TestMethod]
    public void Ar3MovementUsesContinuousGrade_WhileNormalHuntKeepsExistingBehavior()
    {
        var node = WyrmrealmMapGenerator.GenerateFireHunt(32, WyrmTier.Wyrm)
            .First(node => node.Type == WyrmrealmNodeType.Combat);
        var site = node.Geography!;
        var steep = new WorldSiteTerrainPatch("mountain-crest", WorldSiteSurfaceId.Rock, 8, 1,
        [
            new HuntPoint(.49, .25), new HuntPoint(.51, .25),
            new HuntPoint(.51, .75), new HuntPoint(.49, .75),
        ]);
        var artificial = site with
        {
            Landscape = new WorldSiteLandscapeRecipe("steep-test", [])
            {
                TerrainPatches = [steep],
            },
            ScenicPaths = [],
        };
        const double width = 950, height = 1550;
        var from = new Vector2D(.41 * width, .5 * height);
        var to = new Vector2D(.59 * width, .5 * height);
        Assert.IsTrue(WorldSiteElevationField.BlocksTraversal(artificial, from, to, width, height),
            "A steep ridge must block traversal through the C# field, not a JS or color mask.");
        var normal = ArenaEnvironmentState.Create(32, node);
        Assert.IsNull(normal.Snapshot().Geography!.Landscape,
            "AR3 surface diagnostics must not inflate the normal Hunt.");
    }

    [TestMethod]
    public void Ar3PreviewRaster_ExactlyMatchesCSharpWorldSamples()
    {
        var node = WyrmrealmMapGenerator.GenerateFireHunt(47, WyrmTier.Elder)
            .First(node => node.Type == WyrmrealmNodeType.Combat);
        var site = node.Geography!;
        var preview = ArenaEnvironmentState.Create(47, node, worldFirstGeography: true).Snapshot()
            .Geography!.Landscape!.Elevation;
        Assert.IsNotNull(preview);
        Assert.AreEqual(preview.Columns * preview.Rows, preview.Samples.Count);
        var middleX = preview.Columns / 2;
        var middleY = preview.Rows / 2;
        var expected = WorldSiteElevationField.Sample(site,
            new HuntPoint(middleX / (double)(preview.Columns - 1), middleY / (double)(preview.Rows - 1)));
        Assert.AreEqual(expected, preview.Samples[middleY * preview.Columns + middleX],
            "Rendered terrain must be C# samples of the very same field used by movement.");
        Assert.AreEqual(JsonSerializer.Serialize(preview), JsonSerializer.Serialize(
            ArenaEnvironmentState.Create(47, node, worldFirstGeography: true).Snapshot().Geography!.Landscape!.Elevation));
    }

    [TestMethod]
    public void EverySeededScenicFork_LeadsToReachableRuinsInsteadOfEmptyGround()
    {
        const double width = 950, height = 1550;
        var reviewed = 0;
        for (var seed = 0; seed < 60; seed++)
        {
            foreach (var node in WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Wyrm))
            {
                var site = node.Geography!;
                var layout = site.Landscape!;
                if (layout.Kind != "forest-fork") continue;
                reviewed++;
                var ruins = layout.Discoveries.Single(discovery => discovery.Kind == "overgrown-ruins");
                var branch = layout.LocalPaths.Single(path => path.EdgeId == $"{ruins.Id}:access");
                Assert.AreEqual(ruins.LocalPoint, branch.Points[^1]);
                Assert.AreEqual(new HuntPoint(.5, .5), branch.Points[0]);
                for (var index = 1; index < branch.Points.Count; index++)
                {
                    var from = new Vector2D(branch.Points[index - 1].X * width, branch.Points[index - 1].Y * height);
                    var to = new Vector2D(branch.Points[index].X * width, branch.Points[index].Y * height);
                    Assert.IsFalse(WorldSiteFootprintCollision.BlocksSegment(layout, from, to, width, height, 14),
                        $"Seed {seed}, {site.SiteId}: the ruins approach must stay physically open.");
                }
            }
        }
        Assert.IsGreaterThan(10, reviewed, "A visible forest fork should lead to a discoverable ruin.");
    }

    [TestMethod]
    public void MountainEscarpments_AreNaturalIrregularLedgesOfOneToThreeMetres()
    {
        var reviewed = 0;
        for (var seed = 0; seed < 40; seed++)
        {
            foreach (var node in WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Elder))
            {
                var layout = node.Geography!.Landscape!;
                if (layout.Kind is not ("mountain-monastery" or "mountain-pass")) continue;
                reviewed++;
                var faces = layout.Obstacles.Where(obstacle => obstacle.Kind is "cliff-face" or "glacier-cliff-face").ToArray();
                Assert.IsGreaterThan(1, faces.Length);
                Assert.IsTrue(faces.All(face => face.Height >= 1 && face.Height <= 3));
                Assert.IsTrue(faces.All(face => face.Outline.Count >= 6),
                    "Rock faces need irregular outlines, never four-corner wall strips.");
                Assert.IsTrue(faces.Any(face => face.Outline.Count > 6 &&
                    face.Outline.Max(point => point.Y) - face.Outline.Min(point => point.Y) > .08),
                    "A natural escarpment must connect rock shelves into a long continuous ledge.");
                Assert.IsTrue(faces.Select(face => Math.Round(face.Height, 1)).Distinct().Count() > 1,
                    "An entire mountain must not be a uniform-height fence.");
            }
        }
        Assert.IsGreaterThan(5, reviewed);
    }

    [TestMethod]
    public void OptionalDiscoveries_AreDeterministicAndGenuinelyReachableThroughCSharpCollision()
    {
        const double width = 950, height = 1550;
        var discoveries = 0;
        var empty = 0;
        var rewarded = 0;
        for (var seed = 0; seed < 32; seed++)
        {
            var nodes = WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Wyrm);
            var replay = WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Wyrm);
            foreach (var node in nodes)
            {
                var site = node.Geography!;
                var layout = site.Landscape!;
                var repeated = replay.Single(other => other.Id == node.Id).Geography!.Landscape!;
                Assert.AreEqual(JsonSerializer.Serialize(layout.Discoveries), JsonSerializer.Serialize(repeated.Discoveries));
                foreach (var discovery in layout.Discoveries)
                {
                    discoveries++;
                    Assert.AreEqual($"{site.SiteId}:trace", discovery.Id);
                    Assert.IsTrue(layout.LocalPaths.Any(path => path.EdgeId == $"{discovery.Id}:access"),
                        "An optional site needs an actual C# route, not a UI marker.");
                    var from = new Vector2D(width * .5, height * .5);
                    var to = new Vector2D(width * discovery.LocalPoint.X, height * discovery.LocalPoint.Y);
                    Assert.IsFalse(WorldSiteFootprintCollision.BlocksSegment(layout, from, to, width, height, radius: 17),
                        $"Seed {seed}, {site.SiteId}: trace is behind an impassable cliff or building.");
                    if (discovery.MaterialReward is null) empty++;
                    else rewarded++;
                }
            }
        }
        Assert.IsGreaterThan(10, discoveries, "World exploration needs discoverable optional sites.");
        Assert.IsGreaterThan(0, empty, "Some human traces should be honestly picked clean.");
        Assert.IsGreaterThan(0, rewarded, "Other sites should contain tier-legal common salvage.");
    }

    [TestMethod]
    public void ClaimedDiscovery_IsPaidOnceAndNotRecreatedAfterRefugeReturn()
    {
        const double width = 950, height = 1550;
        var match = Enumerable.Range(0, 100)
            .SelectMany(seed => WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Wyrm)
                .Where(node => node.Type == WyrmrealmNodeType.Combat)
                .Select(node => (Seed: seed, Node: node,
                    Discovery: node.Geography!.Landscape!.Discoveries.FirstOrDefault(found => found.MaterialReward is not null))))
            .First(candidate => candidate.Discovery is not null);
        var discovery = match.Discovery!;
        var environment = ArenaEnvironmentState.Create(match.Seed, match.Node, worldFirstGeography: true);
        var location = new Vector2D(discovery.LocalPoint.X * width, discovery.LocalPoint.Y * height);
        var collected = environment.TryCollect(location, width, height, playerRadius: 0, needsHealing: false);
        Assert.IsNotNull(collected);
        Assert.AreEqual(discovery.Id, collected.DiscoveryId);
        Assert.AreEqual($"material:{discovery.MaterialReward}", collected.Kind);
        Assert.IsNull(environment.TryCollect(location, width, height, playerRadius: 0, needsHealing: false)?.DiscoveryId);

        var claimed = new HashSet<string>(StringComparer.Ordinal) { discovery.Id };
        var revisited = ArenaEnvironmentState.Create(match.Seed, match.Node, worldFirstGeography: true,
            claimedDiscoveries: claimed);
        Assert.IsFalse(revisited.Snapshot().Supplies.Any(supply => supply.DiscoveryId == discovery.Id));
    }

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
                Assert.IsTrue(site.Geography.Landscape.TerrainPatches.All(patch => patch.Outline.Count >= 3));
                foreach (var patch in site.Geography.Landscape.TerrainPatches)
                {
                    Assert.IsTrue(patch.Outline.All(point =>
                        point.X > 0 && point.X < 1 && point.Y > 0 && point.Y < 1),
                        $"seed {seed} site {site.Id}: elevation outside physical world");
                }
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
            Assert.AreEqual(normalSnapshot.Supplies.Count,
                physicalSnapshot.Supplies.Count(supply => supply.DiscoveryId is null),
                "World-first preview must preserve every legacy supply unchanged.");
            var expectedFinds = node.Type == WyrmrealmNodeType.Combat
                ? physicalSnapshot.Geography.Landscape.Discoveries.Count(discovery => discovery.MaterialReward is not null)
                : 0;
            Assert.AreEqual(expectedFinds, physicalSnapshot.Supplies.Count(supply => supply.DiscoveryId is not null),
                "Only C#-authorized unclaimed discoveries may add optional pickups.");
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
            Assert.IsTrue(site.Landscape!.Discoveries.Any(discovery => discovery.Kind == "overgrown-ruins"),
                "A forest fork needs a real ruins destination, not a wandering dead end.");
            Assert.AreEqual(1, site.ScenicPaths.Count,
                "A Chart junction must not generate radial roads into every abstract exit.");
            var regionalRoad = site.ScenicPaths.Single();
            Assert.AreEqual("site-main-trail", regionalRoad.EdgeId);
            Assert.AreEqual(new HuntPoint(.5, .5), regionalRoad.Points[2]);
            Assert.IsTrue(site.Landscape.LocalPaths.Any(path => path.EdgeId.EndsWith(":trace:access", StringComparison.Ordinal)),
                "A real C# ruins destination, not Chart degree, is what justifies the scenic branch.");
            Assert.AreEqual(site.Ports.Count, site.Ports.Select(port => port.EdgeId).Distinct().Count());
        }
    }

    [TestMethod]
    public void MountainMonastery_RoadsAscendFromSouthernValleyToWindingGateWithoutChartSpokes()
    {
        var reviewed = 0;
        for (var seed = 0; seed < 65; seed++)
        {
            foreach (var node in WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Elder))
            {
                var site = node.Geography!;
                if (site.Landscape?.Kind != "mountain-monastery") continue;
                reviewed++;
                Assert.AreEqual(1, site.ScenicPaths.Count,
                    "The count of Chart exits must never turn a mountain into a road star.");
                var road = site.ScenicPaths.Single();
                Assert.AreEqual("site-main-trail", road.EdgeId);
                Assert.AreEqual(25, road.Points.Count);
                Assert.AreEqual(.965, road.Points[0].Y, 1e-9, "Main path enters from the southern valley.");
                Assert.AreEqual(new HuntPoint(.5, .5), road.Points[^1]);
                Assert.IsTrue(road.Points.Any(point => point.X < .49) &&
                    road.Points.Any(point => point.X > .51), "The ascending valley path should curve naturally.");
                var monastery = site.Landscape.LocalPaths.Single(path => path.EdgeId == "monastery-approach");
                Assert.AreEqual(road.Points[^1], monastery.Points[0],
                    "The scenic ascent must join the actual C# monastery approach.");
                Assert.IsTrue(site.ScenicPaths.All(path => !path.EdgeId.StartsWith("site-port-access-", StringComparison.Ordinal)));
            }
        }
        Assert.IsGreaterThan(4, reviewed);
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
        Assert.AreEqual(2, site.Landscape.Obstacles.Count(obstacle => obstacle.Kind == "monastery-wing"));
        Assert.AreEqual(1, site.Landscape.Obstacles.Count(obstacle => obstacle.Kind == "monastery-tower"));
        Assert.AreEqual(6, site.Landscape.TerrainPatches.Count(patch => patch.Kind.StartsWith("mountain-")));
        foreach (var grade in new[] { "mountain-foothill", "mountain-shoulder", "mountain-crest" })
        {
            var ridges = site.Landscape.TerrainPatches.Where(patch => patch.Kind == grade).ToArray();
            Assert.AreEqual(2, ridges.Length, $"There must be one connected {grade} ridge on each side.");
            Assert.IsTrue(ridges.All(patch => patch.Outline.Min(point => point.Y) < .04 &&
                patch.Outline.Max(point => point.Y) > .96), $"{grade} must extend across the site, not form islands.");
        }
        Assert.AreEqual(1, site.Landscape.TerrainPatches.Count(patch => patch.Kind == "monastery-terrace"));
        Assert.AreEqual(1, site.Landscape.LocalPaths.Count(path => path.EdgeId == "monastery-approach"));
        Assert.IsTrue(site.Landscape.LocalPaths.All(path => site.Ports.All(port => path.EdgeId != port.EdgeId)),
            "Local monastery access must never be copied from a Chart connection.");
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

    [TestMethod]
    public void MountainMonastery_TerrainHasVisibleHighlandBandsAndWalkableMappedExitsAcrossSeeds()
    {
        const double width = 950, height = 1550;
        var reviewed = 0;
        for (var seed = 0; seed < 65; seed++)
        {
            var site = WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Elder)
                .Single(node => node.Id.EndsWith("-crossroads", StringComparison.Ordinal)).Geography!;
            if (site.Landscape!.Kind != "mountain-monastery") continue;
            reviewed++;
            var terrain = site.Landscape.TerrainPatches;
            Assert.IsGreaterThanOrEqualTo(6, terrain.Count,
                $"seed {seed}: a mountain must have continuous graded ridge surfaces");
            Assert.IsTrue(terrain.Any(patch => patch.Height >= .8 && patch.Slope >= .7),
                $"seed {seed}: the ridge needs a steep, high crest");
            Assert.IsTrue(terrain.Any(patch => patch.Kind == "monastery-terrace"),
                $"seed {seed}: monastery architecture requires a graded plateau");
            Assert.IsTrue(site.Landscape.Obstacles.Any(obstacle => obstacle.Kind == "cliff"),
                $"seed {seed}: the mountain must contain physical cliffs");
            foreach (var corridor in site.Corridors)
            {
                var from = new Vector2D(corridor.Points[0].X * width, corridor.Points[0].Y * height);
                var to = new Vector2D(corridor.Points[^1].X * width, corridor.Points[^1].Y * height);
                Assert.IsFalse(WorldSiteFootprintCollision.BlocksSegment(site.Landscape, from, to, width, height, radius: 12),
                    $"seed {seed}: generated mountain/monastery blocked Chart exit {corridor.EdgeId}");
            }
        }
        Assert.IsGreaterThan(4, reviewed, "The reviewed Elder map must produce genuine mountain monasteries.");
    }
    [TestMethod]
    public void MountainMonastery_RealCliffFacesBlockTraversalButReserveWindingLowPasses()
    {
        const double width = 950, height = 1550;
        var reviewed = 0;
        for (var seed = 0; seed < 65; seed++)
        {
            var node = WyrmrealmMapGenerator.GenerateFireHunt(seed, WyrmTier.Elder)
                .Single(candidate => candidate.Id.EndsWith("-crossroads", StringComparison.Ordinal));
            var site = node.Geography!;
            var layout = site.Landscape!;
            if (layout.Kind != "mountain-monastery")
            {
                continue;
            }

            reviewed++;
            var cliffFaces = layout.Obstacles.Where(obstacle => obstacle.Kind == "cliff-face").ToArray();
            Assert.IsGreaterThan(1, cliffFaces.Length, $"seed {seed}: highland needs real C# cliff barriers on both sides");
            Assert.IsTrue(cliffFaces.Any(obstacle => obstacle.Outline.Average(point => point.X) < .5));
            Assert.IsTrue(cliffFaces.Any(obstacle => obstacle.Outline.Average(point => point.X) > .5));
            var faceOnly = new WorldSiteLandscapeRecipe(layout.Kind, cliffFaces);
            var environment = ArenaEnvironmentState.Create(seed, node, worldFirstGeography: true);
            var approach = layout.LocalPaths.Single(path => path.EdgeId == "monastery-approach");
            Assert.IsGreaterThan(30, approach.Points.Count, $"seed {seed}: a mountain path must have smooth sampled bends");
            Assert.IsTrue(approach.Points.Any(point => point.X < .49) &&
                          approach.Points.Any(point => point.X > .51),
                $"seed {seed}: the monastery route must wind in both directions before reaching the gate");
            Assert.IsTrue(approach.Points.Take(25).All(point => Math.Abs(point.X - .5) < .07),
                $"seed {seed}: switchbacks must be gentle rather than tightly knotted");

            foreach (var route in site.Corridors.Concat(site.ScenicPaths).Concat(layout.LocalPaths))
            {
                for (var index = 1; index < route.Points.Count; index++)
                {
                    var from = new Vector2D(route.Points[index - 1].X * width, route.Points[index - 1].Y * height);
                    var to = new Vector2D(route.Points[index].X * width, route.Points[index].Y * height);
                    Assert.IsFalse(WorldSiteFootprintCollision.BlocksSegment(faceOnly, from, to, width, height, radius: 12),
                        $"seed {seed}: C# ridge blocks reserved low pass {route.EdgeId}");
                    if (route.EdgeId == "monastery-approach")
                    {
                        var blockedBy = layout.Obstacles.FirstOrDefault(obstacle =>
                            WorldSiteFootprintCollision.BlocksSegment(
                                new WorldSiteLandscapeRecipe(layout.Kind, [obstacle]), from, to,
                                width, height, radius: 12));
                        Assert.IsNull(blockedBy,
                            $"seed {seed}: monastery switchback segment {index} is blocked by {blockedBy?.Kind} " +
                            $"from {from} to {to}");
                    }
                }
            }

            var solid = cliffFaces.First();
            var x = solid.Outline.Average(point => point.X) * width;
            var y = solid.Outline.Average(point => point.Y) * height;
            Assert.IsTrue(environment.IsBlocked(new Vector2D(x, y), width, height, radius: 5),
                $"seed {seed}: cliff shown in AR1 must block player and enemy collision");
            Assert.IsTrue(environment.BlocksSegment(new Vector2D(x - 45, y), new Vector2D(x + 45, y),
                width, height, radius: 5), $"seed {seed}: no direct shortcut through a sheer cliff");
        }

        Assert.IsGreaterThan(4, reviewed, "Elder sites need reviewed mountain-monastery examples.");
    }

}
