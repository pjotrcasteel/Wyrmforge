using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.World;

namespace Wyrmforge.Application.Tests.World;

[TestClass]
public sealed class TownCrowdTests
{
    private static TownNavigationMap Scene() =>
        TownNavigationMap.FromJson(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "night-navigation.json")));

    [TestMethod]
    public void Step_SameSeedAndTicks_ReplaysIdenticalPedestrians()
    {
        var first = new TownCrowd(Scene(), 451);
        var replay = new TownCrowd(Scene(), 451);
        var witnessedMovement = false;

        for (var tick = 0; tick < 800; tick++)
        {
            first.Step(TimeSpan.FromMilliseconds(100));
            replay.Step(TimeSpan.FromMilliseconds(100));
            for (var i = 0; i < first.Citizens.Count; i++)
            {
                var actual = first.Citizens[i];
                var expected = replay.Citizens[i];
                Assert.AreEqual(expected.Position, actual.Position);
                Assert.AreEqual(expected.DestinationNode, actual.DestinationNode);
                Assert.IsTrue(first.Navigation.IsWalkable(actual.Position), "A citizen left the paved pedestrian region.");
                witnessedMovement |= actual.IsWalking;
            }
        }

        Assert.IsTrue(witnessedMovement, "Citizens should roam, not remain frozen at their initial positions.");
    }

    [TestMethod]
    public void Step_LongBackgroundDelay_IsLimitedToOneTick()
    {
        var resumed = new TownCrowd(Scene(), 17);
        var regular = new TownCrowd(Scene(), 17);

        resumed.Step(TimeSpan.FromMinutes(3));
        regular.Step(TimeSpan.FromMilliseconds(100));

        for (var i = 0; i < resumed.Citizens.Count; i++)
            Assert.AreEqual(regular.Citizens[i].Position, resumed.Citizens[i].Position);
    }

    [TestMethod]
    public void Step_PedestriansNeverJumpAcrossScenery()
    {
        var town = new TownCrowd(Scene(), 261);
        for (var tick = 0; tick < 1000; tick++)
        {
            var before = town.Citizens.Select(c => c.Position).ToArray();
            town.Step(TimeSpan.FromMilliseconds(100));
            for (var i = 0; i < town.Citizens.Count; i++)
            {
                var person = town.Citizens[i];
                var travel = MathF.Sqrt(MathF.Pow(person.Position.X - before[i].X, 2) +
                    MathF.Pow(person.Position.Y - before[i].Y, 2));
                Assert.IsTrue(travel <= 5.2f, $"Citizen {person.Id} jumped {travel} painted pixels.");
                Assert.IsTrue(town.Navigation.IsWalkable(person.Position));
            }

            var destinations = town.Citizens.Where(c => c.IsPresent && c.IsWalking)
                .Select(c => c.DestinationNode).ToList();
            Assert.AreEqual(destinations.Count, destinations.Distinct().Count(), "Multiple people claimed one destination.");
            foreach (var person in town.Citizens.Where(candidate => candidate.IsPresent))
            foreach (var other in town.Citizens.Where(candidate => candidate.IsPresent && candidate.Id > person.Id))
            {
                var dx = person.Position.X - other.Position.X;
                var dy = person.Position.Y - other.Position.Y;
                Assert.IsTrue(dx * dx + dy * dy >= 19f * 19f,
                    $"Citizens {person.Id} and {other.Id} overlap on the painted ground.");
            }
        }
    }

    [TestMethod]
    public void Navigation_ExteriorStreetsAndGateRemainConnected()
    {
        var map = Scene();
        var origin = map.Destinations.Single(d => d.Id == "lower-square").Position;
        var exits = map.Destinations.Where(d => d.IsExit).ToArray();

        Assert.HasCount(4, exits);
        foreach (var exit in exits)
        {
            Assert.IsTrue(map.IsWalkable(exit.Position), $"Exit {exit.Id} must fit an NPC's feet.");
            Assert.IsTrue(map.TryFindPath(origin, exit.Position, out var path),
                $"Exit {exit.Id} must connect to the actual town navigation, not just a fake label.");
            CheckRoute(map, origin, path);
        }
        Assert.IsTrue(map.Destinations.Any(d => d.Id == "world-gate-exit" && d.Y < 300));
    }

    [TestMethod]
    public void Step_ResidentsLeaveViaGateOrRoadAndReturnWithoutVisibleTeleport()
    {
        var town = new TownCrowd(Scene(), 205);
        var departed = new HashSet<string>();
        var observedReturn = false;
        var wasAbsent = new HashSet<int>();

        for (var tick = 0; tick < 4200; tick++)
        {
            var previous = town.Citizens.ToDictionary(c => c.Id, c => c.Position);
            town.Step(TimeSpan.FromMilliseconds(100));
            foreach (var person in town.Citizens)
            {
                if (person.LastExitId is not null) departed.Add(person.LastExitId);
                if (!person.IsPresent) wasAbsent.Add(person.Id);
                if (person.IsPresent && wasAbsent.Contains(person.Id)) observedReturn = true;

                if (!person.IsPresent) continue;
                var old = previous[person.Id];
                var dx = person.Position.X - old.X;
                var dy = person.Position.Y - old.Y;
                Assert.IsTrue(dx * dx + dy * dy <= 5.2f * 5.2f,
                    $"Present citizen {person.Id} visibly jumped after returning through an exit.");
            }
        }

        foreach (var exit in new[] { "world-gate-exit", "west-street-exit",
            "east-street-exit", "south-street-exit" })
            Assert.IsTrue(departed.Contains(exit), $"At least one resident must traverse {exit}.");
        Assert.IsTrue(observedReturn, "Residents can come back through an entrance after time away.");
    }

    [TestMethod]
    public void Navigation_FourBuildingForecourtsConnectWithoutCrossingFoundations()
    {
        var map = Scene();
        var origin = map.Destinations.Single(node => node.Id == "lower-square").Position;
        var work = map.Destinations.Where(node => node.BuildingId is not null).ToArray();

        Assert.HasCount(8, work);
        foreach (var destination in work)
        {
            Assert.IsFalse(destination.IsExit);
            Assert.IsTrue(map.IsWalkable(destination.Position),
                $"Work destination {destination.Id} overlaps scenery.");
            Assert.IsTrue(map.TryFindPath(origin, destination.Position, out var path),
                $"Forecourt {destination.Id} must have a real street connection.");
            CheckRoute(map, origin, path);
        }
        Assert.IsFalse(map.IsWalkable(new TownPoint(672, 739)),
            "The blue-marked left staircase flowerbed is a real solid ground footprint.");
    }

    [TestMethod]
    public void TownCrowd_TwoWorkersPerUnlockedBuilding_AndThreeFreeRoamers()
    {
        var map = Scene();
        var vacant = new TownCrowd(map, seed: 205);
        Assert.IsFalse(vacant.Citizens.Any(citizen => citizen.IsWorking));
        Assert.HasCount(7, vacant.Citizens);

        var unlocked = new[] { "build", "forge", "codex", "legends" };
        var populated = new TownCrowd(Scene(), seed: 205, openBuildings: unlocked);
        Assert.HasCount(11, populated.Citizens);
        Assert.AreEqual(8, populated.AssignedWorkers);
        Assert.AreEqual(8, populated.ActiveWorkers);
        foreach (var building in unlocked)
            Assert.AreEqual(2, populated.Citizens.Count(citizen => citizen.WorkBuildingId == building),
                $"Exactly two workers should initially serve {building}.");
        Assert.AreEqual(3, populated.Citizens.Count(citizen => citizen.AssignedBuildingId is null));
        CollectionAssert.AreEquivalent(unlocked,
            populated.Citizens.Where(citizen => citizen.IsWorking)
                .Select(citizen => citizen.WorkBuildingId!).Distinct().ToArray());
        Assert.IsTrue(populated.Citizens.Where(citizen => citizen.IsWorking)
            .All(citizen => citizen.CurrentActivity is not null));

        populated.SetOpenBuildings([]);
        Assert.IsFalse(populated.Citizens.Any(citizen => citizen.IsWorking),
            "Workers must stop when an active building becomes vacant.");
        Assert.IsTrue(populated.Citizens.All(citizen => citizen.WorkBuildingId is null));
        Assert.AreEqual(0, populated.AssignedWorkers);
    }

    [TestMethod]
    public void TownCrowd_UnlocksWhileRunning_AssignsTwoWorkersPerBuilding()
    {
        var town = new TownCrowd(Scene(), seed: 205);
        Assert.HasCount(7, town.Citizens);
        town.SetOpenBuildings(["forge"]);
        Assert.AreEqual(2, town.AssignedWorkers);
        Assert.AreEqual(7, town.Citizens.Count);
        // Unlock while residents are already travelling: do not accidentally
        // spawn above the bounded workforce just because everyone is busy.
        for (var tick = 0; tick < 30; tick++) town.Step(TimeSpan.FromMilliseconds(100));
        town.SetOpenBuildings(["build", "forge", "codex", "legends"]);
        Assert.AreEqual(8, town.AssignedWorkers);
        Assert.HasCount(11, town.Citizens);
        Assert.AreEqual(3, town.Citizens.Count(c => c.AssignedBuildingId is null));
        foreach (var building in new[] { "build", "forge", "codex", "legends" })
            Assert.AreEqual(2, town.Citizens.Count(c => c.AssignedBuildingId == building));

        for (var tick = 0; tick < 300; tick++)
        {
            town.Step(TimeSpan.FromMilliseconds(100));
            foreach (var citizen in town.Citizens)
                Assert.IsTrue(town.Navigation.IsWalkable(citizen.Position));
        }
        Assert.IsTrue(town.PathfindCount > 0);
        Assert.IsTrue(town.PathfindTotalMilliseconds >= 0);

        town.SetOpenBuildings([]);
        Assert.AreEqual(0, town.AssignedWorkers);
        Assert.IsFalse(town.Citizens.Any(c => c.IsWorking));
    }

    [TestMethod]
    public void TownCrowd_DoubleWorkers_ReplayMatchesSeed()
    {
        var open = new[] { "build", "forge", "codex", "legends" };
        var left = new TownCrowd(Scene(), seed: 991, openBuildings: open);
        var right = new TownCrowd(Scene(), seed: 991, openBuildings: open);
        for (var tick = 0; tick < 250; tick++)
        {
            left.Step(TimeSpan.FromMilliseconds(100));
            right.Step(TimeSpan.FromMilliseconds(100));
            for (var i = 0; i < left.Citizens.Count; i++)
            {
                Assert.AreEqual(right.Citizens[i].Position, left.Citizens[i].Position);
                Assert.AreEqual(right.Citizens[i].DestinationNode, left.Citizens[i].DestinationNode);
                Assert.AreEqual(right.Citizens[i].AssignedBuildingId, left.Citizens[i].AssignedBuildingId);
            }
        }
    }

    [TestMethod]
    public void Navigation_WellForcesPhysicalDetour()
    {
        var map = Scene();
        var west = map.Destinations.Single(destination => destination.Id == "west").Position;
        var east = map.Destinations.Single(destination => destination.Id == "east").Position;

        Assert.IsFalse(map.IsWalkable(new TownPoint(824, 511)), "The well must have a real solid footprint.");
        Assert.IsFalse(map.IsSegmentWalkable(west, east), "Direct walking through the well must be impossible.");
        Assert.IsTrue(map.TryFindPath(west, east, out var route), "The plaza should have an alternative route.");
        Assert.IsTrue(route.Count > 1);
        CheckRoute(map, west, route);
    }

    [TestMethod]
    public void Navigation_OnlyGroundContactBlocksPedestrianFeet()
    {
        var map = Scene();

        Assert.IsFalse(map.IsWalkable(new TownPoint(825, 535)),
            "The stone well base blocks the feet, including their collision radius.");
        Assert.IsTrue(map.IsWalkable(new TownPoint(825, 478)),
            "Behind the well roof is still paved ground, not a roof-sized collider.");
        Assert.IsTrue(map.IsWalkable(new TownPoint(825, 584)),
            "An NPC in front of the well can overlap its image without colliding.");
        Assert.IsFalse(map.IsWalkable(new TownPoint(935, 730)),
            "The marked east staircase flowerbed is physical ground, not free paving.");
        Assert.IsTrue(map.IsWalkable(new TownPoint(850, 730)),
            "The central approach beside the flowerbed must stay walkable.");
        Assert.IsFalse(map.IsWalkable(new TownPoint(1036, 738)),
            "The planter's ground footprint remains solid.");
        Assert.IsFalse(map.IsWalkable(new TownPoint(624, 444)),
            "Gate banners still have solid plinths at ground level.");
        Assert.IsFalse(map.IsWalkable(new TownPoint(620, 728)),
            "Lower lantern pillars still have ground-contact footprints.");

        foreach (var destination in map.Destinations)
            Assert.IsTrue(map.IsWalkable(destination.Position), $"Spawn {destination.Id} overlaps scenery.");
    }

    [TestMethod]
    public void Navigation_SafePlazaRoutesRemainConnectedAroundEveryObstacle()
    {
        var map = Scene();
        var origin = map.Destinations.Single(destination => destination.Id == "lower-square").Position;
        Assert.IsTrue(map.Obstacles.Count >= 7);
        Assert.IsTrue(map.Clearance >= 10);

        foreach (var destination in map.Destinations)
        {
            Assert.IsTrue(map.TryFindPath(origin, destination.Position, out var path),
                $"Plaza destination {destination.Id} must remain reachable.");
            CheckRoute(map, origin, path);
        }
    }

    [TestMethod]
    public void Navigation_WellAndNoticeboardUseIndependentPhysicalDepth()
    {
        var map = Scene();
        var well = map.Occluders.Single(part => part.Id == "well-foreground");
        var board = map.Occluders.Single(part => part.Id == "noticeboard-foreground");
        Assert.AreEqual(572f, well.DepthY);
        Assert.AreEqual(522f, board.DepthY);
        Assert.AreEqual(well.Artwork, board.Artwork);
        Assert.IsTrue(board.Clip.All(point => point.X < 815), "The board must not cover the well's open bays.");
        Assert.IsTrue(well.Clip.Any(point => point.X > 920), "The canopy silhouette remains physically bounded.");
        Assert.IsTrue(map.IsWalkable(new TownPoint(825, 478)),
            "Rear paving behind the actual structure must remain traversable.");
        Assert.IsTrue(map.IsWalkable(new TownPoint(825, 584)),
            "Front paving must not become a fake collider for visual depth.");
    }

    [TestMethod]
    public void Navigation_PlazaForegroundMasksHavePaintedDepth()
    {
        var map = Scene();
        var ids = new[] { "west-gate-banner-foreground", "east-gate-banner-foreground",
            "west-lower-pillar-foreground", "east-lower-pillar-foreground" };

        foreach (var id in ids)
        {
            var foreground = map.Occluders.Single(part => part.Id == id);
            Assert.IsTrue(foreground.Clip.Count >= 5, $"Foreground mask {id} must trace its painted silhouette.");
            Assert.AreEqual("art/town/night-active.webp?v=140", foreground.Artwork);
            Assert.IsTrue(foreground.DepthY >= (id.Contains("lower") ? 750 : 450));
        }
    }

    [TestMethod]
    public void Navigation_GroundCollisionAndVisualOcclusionAreIndependent()
    {
        var map = Scene();
        Assert.IsTrue(map.Occluders.Any(part => part.Id == "world-gate-arch-roof"),
            "An elevated arch is visual geometry, not a solid ground footprint.");
        Assert.IsFalse(map.Obstacles.Any(obstacle => obstacle.Id == "world-gate-arch-roof"));
        Assert.IsTrue(map.IsWalkable(new TownPoint(825, 478)));
        Assert.IsTrue(map.IsBodyOccluded(new TownPoint(825, 478)),
            "A visible body may intersect the painted well, but its feet remain walkable.");
    }

    [TestMethod]
    public void Navigation_CitizenOcclusion_OnlyAppliesToPaintedStructures()
    {
        var map = Scene();

        Assert.IsTrue(map.IsBodyOccluded(new TownPoint(825, 500)), "The well must conceal a citizen behind it.");
        Assert.IsFalse(map.IsBodyOccluded(new TownPoint(665, 535)),
            "NPCs on the exposed paved ring must never disappear under a broad well polygon.");
        Assert.IsFalse(map.IsBodyOccluded(new TownPoint(825, 660)),
            "Citizens in the open plaza in front of the well remain visible.");
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() =>
            map.IsBodyOccluded(new TownPoint(825, 500), bodyWidth: 0f));
    }

    [TestMethod]
    public void Navigation_AllFourBuildingsAndGateTowersHaveGroundFootprints()
    {
        var map = Scene();
        var buildings = new[] { "arcane-nexus-building", "blacksmith-building",
            "codex-building", "hall-of-fame-building", "world-gate-west-tower",
            "world-gate-east-tower" };

        foreach (var id in buildings)
        {
            var building = map.Obstacles.Single(obstacle => obstacle.Id == id);
            Assert.IsTrue(building.Footprint.Count >= 4, $"Missing building ground footprint for {id}.");
        }

        var raisedArch = map.Occluders.Single(part => part.Id == "world-gate-arch-roof");
        Assert.IsTrue(raisedArch.Clip.Count >= 4);
        Assert.IsFalse(map.Obstacles.Any(obstacle => obstacle.Id == raisedArch.Id));

        Assert.IsTrue(map.RemoveObstacle("arcane-nexus-building"));
        Assert.AreEqual(1, map.Revision);
    }

    [TestMethod]
    public void Navigation_MemoizedGridChecksReuseResultsAndStillRespondToCartChanges()
    {
        var map = Scene();
        var west = map.Destinations.Single(destination => destination.Id == "west").Position;
        var east = map.Destinations.Single(destination => destination.Id == "east").Position;
        Assert.IsTrue(map.TryFindPath(west, east, out var first));
        CheckRoute(map, west, first);
        Assert.IsTrue(map.CachedGridCellCount > 0);
        Assert.IsTrue(map.CachedGridEdgeCount > 0);

        var cellChecks = map.CachedGridCellCount;
        var edgeChecks = map.CachedGridEdgeCount;
        Assert.IsTrue(map.TryFindPath(west, east, out var second));
        CollectionAssert.AreEqual(first, second);
        Assert.AreEqual(cellChecks, map.CachedGridCellCount,
            "Repeating an identical path must reuse all geometry cell checks.");
        Assert.AreEqual(edgeChecks, map.CachedGridEdgeCount,
            "Repeating an identical path must reuse all geometry edge checks.");

        map.SetObstacle(new TownFootprint
        {
            Id = "temporary-crossing-cart",
            Footprint = [new(774, 765), new(876, 765), new(876, 808), new(774, 808)]
        });
        Assert.IsFalse(map.IsSegmentWalkable(new TownPoint(825, 715), new TownPoint(824, 866)));
        Assert.IsTrue(map.TryFindPath(west, east, out var aroundCart));
        CheckRoute(map, west, aroundCart);
        Assert.IsTrue(map.RemoveObstacle("temporary-crossing-cart"));
        Assert.IsTrue(map.TryFindPath(west, east, out var restored));
        CollectionAssert.AreEqual(first, restored);
    }

    [TestMethod]
    public void Navigation_ScreenshotMarksAreGroundContactObstaclesOnly()
    {
        var map = Scene();
        Assert.IsTrue(map.Obstacles.Any(footprint => footprint.Id == "well-noticeboard-post"));
        Assert.IsTrue(map.Obstacles.Any(footprint => footprint.Id == "east-stair-railing-planter"));
        Assert.IsFalse(map.IsWalkable(new TownPoint(765, 493)),
            "Feet cannot stand inside the noticeboard support pictured beside the well.");
        Assert.IsFalse(map.IsWalkable(new TownPoint(911, 751)),
            "The east stair railing/flowers must have a real collision footprint.");
        Assert.IsTrue(map.IsWalkable(new TownPoint(824, 478)),
            "The well roof must remain visual-only on the open ground behind the well.");
        Assert.IsTrue(map.IsWalkable(new TownPoint(836, 889)),
            "The southern road remains open after adding the foreground garden.");
    }

    [TestMethod]
    public void Navigation_NewCartBlocksDirectRoadAndTriggersReplanning()
    {
        var map = Scene();
        var start = new TownPoint(827, 715);
        var destination = new TownPoint(824, 866);
        Assert.IsTrue(map.TryFindPath(start, destination, out var original));
        Assert.HasCount(1, original, "This street should be unobstructed before placing the cart.");

        map.SetObstacle(new TownFootprint
        {
            Id = "vendor-cart",
            Footprint = [new(775, 764), new(885, 764), new(885, 809), new(775, 809)]
        });
        Assert.AreEqual(1, map.Revision);
        Assert.IsFalse(map.IsSegmentWalkable(start, destination), "The newly placed cart must stop straight-line walking.");
        Assert.IsTrue(map.TryFindPath(start, destination, out var detour));
        Assert.IsTrue(detour.Count > 1);
        CheckRoute(map, start, detour);

        Assert.IsTrue(map.RemoveObstacle("vendor-cart"));
        Assert.AreEqual(2, map.Revision);
        Assert.IsTrue(map.TryFindPath(start, destination, out var restored));
        Assert.HasCount(1, restored, "Removing the cart should restore the original direct road.");
    }

    [TestMethod]
    public void Navigation_WellHasArtworkDepthOccluder()
    {
        var map = Scene();
        var well = map.Occluders.Single(o => o.Id == "well-foreground");
        Assert.AreEqual("art/town/night-active.webp?v=140", well.Artwork);
        Assert.IsTrue(well.DepthY > 500);
        Assert.IsTrue(well.Clip.Count >= 6);
        StringAssert.StartsWith(map.ForegroundClip(well), "polygon(");
    }

    [TestMethod]
    public void TownCrowd_FourteenCitizenStressRun_PreservesWorkersAndGroundSeparation()
    {
        var open = new[] { "build", "forge", "codex", "legends" };
        var crowded = new TownCrowd(Scene(), seed: 205, citizenCount: 14, openBuildings: open);
        Assert.HasCount(14, crowded.Citizens);
        Assert.AreEqual(8, crowded.AssignedWorkers);
        Assert.AreEqual(6, crowded.Citizens.Count(citizen => citizen.AssignedBuildingId is null));
        Assert.HasCount(14, new TownCrowd(Scene(), citizenCount: 14).Citizens);

        for (var tick = 0; tick < 300; tick++)
        {
            crowded.Step(TimeSpan.FromMilliseconds(100));
            foreach (var person in crowded.Citizens.Where(citizen => citizen.IsPresent))
            {
                Assert.IsTrue(crowded.Navigation.IsWalkable(person.Position));
                foreach (var other in crowded.Citizens.Where(citizen => citizen.IsPresent && citizen.Id > person.Id))
                {
                    var dx = person.Position.X - other.Position.X;
                    var dy = person.Position.Y - other.Position.Y;
                    Assert.IsTrue(dx * dx + dy * dy >= 19f * 19f,
                        $"Citizens {person.Id} and {other.Id} overlap under 14-NPC load.");
                }
            }
        }
    }

    [TestMethod]
    public void TownCrowd_InvalidCount_IsRejected()
    {
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new TownCrowd(Scene(), citizenCount: -1));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new TownCrowd(Scene(), citizenCount: 20));
        Assert.HasCount(0, new TownCrowd(Scene(), citizenCount: 0).Citizens);
        Assert.HasCount(7, new TownCrowd(Scene()).Citizens);
    }

    private static void CheckRoute(TownNavigationMap map, TownPoint start, IReadOnlyList<TownPoint> path)
    {
        var previous = start;
        foreach (var next in path)
        {
            Assert.IsTrue(map.IsWalkable(next));
            Assert.IsTrue(map.IsSegmentWalkable(previous, next), "Segment cuts through a collider or outside the paved floor.");
            previous = next;
        }
    }
}
