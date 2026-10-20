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

            var destinations = town.Citizens.Where(c => c.IsWalking).Select(c => c.DestinationNode).ToList();
            Assert.AreEqual(destinations.Count, destinations.Distinct().Count(), "Multiple people claimed one destination.");
        }
    }

    [TestMethod]
    public void Navigation_WellForcesPhysicalDetour()
    {
        var map = Scene();
        var west = new TownPoint(570, 528);
        var east = new TownPoint(1080, 542);

        Assert.IsFalse(map.IsWalkable(new TownPoint(824, 511)), "The well must have a real solid footprint.");
        Assert.IsFalse(map.IsSegmentWalkable(west, east), "Direct walking through the well must be impossible.");
        Assert.IsTrue(map.TryFindPath(west, east, out var route), "The plaza should have an alternative route.");
        Assert.IsTrue(route.Count > 1);
        CheckRoute(map, west, route);
    }

    [TestMethod]
    public void Navigation_ActualPlazaPropsAreSolidNotOnlyTheWell()
    {
        var map = Scene();
        var blocked = new Dictionary<string, TownPoint>
        {
            ["well-roof"] = new(826, 410),
            ["well-sign"] = new(745, 509),
            ["west-upper-banner"] = new(620, 385),
            ["east-upper-banner"] = new(1050, 387),
            ["west-lower-lamp"] = new(615, 635),
            ["east-lower-lamp"] = new(1030, 635),
            ["west-garden"] = new(610, 700),
            ["east-garden"] = new(1090, 700)
        };

        foreach (var (landmark, point) in blocked)
            Assert.IsFalse(map.IsWalkable(point), $"Citizen feet must not cross the painted {landmark}.");

        foreach (var destination in map.Destinations)
            Assert.IsTrue(map.IsWalkable(destination.Position), $"Spawn {destination.Id} overlaps scenery.");
    }

    [TestMethod]
    public void Navigation_SafePlazaRoutesRemainConnectedAroundEveryObstacle()
    {
        var map = Scene();
        var origin = map.Destinations.Single(destination => destination.Id == "lower-square").Position;
        Assert.IsGreaterThanOrEqualTo(7, map.Obstacles.Count);
        Assert.IsGreaterThanOrEqualTo(10, map.Clearance);

        foreach (var destination in map.Destinations)
        {
            Assert.IsTrue(map.TryFindPath(origin, destination.Position, out var path),
                $"Plaza destination {destination.Id} must remain reachable.");
            CheckRoute(map, origin, path);
        }
    }

    [TestMethod]
    public void Navigation_WellForegroundExtendsAboveTheRoofAndSign()
    {
        var map = Scene();
        var foreground = map.Occluders.Single(part => part.Id == "well-foreground");
        Assert.IsLessThan(365, foreground.Clip.Min(point => point.Y));
        Assert.IsGreaterThan(580, foreground.DepthY);
        Assert.IsTrue(foreground.Clip.Any(point => point.X < 670),
            "Sign and well sides need an occlusion silhouette, not only a roof rectangle.");
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
