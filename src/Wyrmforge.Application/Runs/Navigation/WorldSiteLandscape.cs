using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Runs.Navigation;

/// <summary>One bounded, C#-authored physical footprint. Render and collision consume exactly this polygon.</summary>
public sealed record WorldSiteObstacle(
    string Kind,
    WorldSiteSurfaceId Material,
    double Height,
    IReadOnlyList<HuntPoint> Outline);

/// <summary>A landmark-shaped site plan, not a new simulation or rendering engine.</summary>
public sealed record WorldSiteLandscapeRecipe(
    string Kind,
    IReadOnlyList<WorldSiteObstacle> Obstacles);

/// <summary>Deterministic local scenery from world-map habitat and landmark metadata, without consuming combat or reward RNG.</summary>
public static class WorldSiteLandscapeGenerator
{
    /// <summary>Creates seeded place geometry while reserving mapped exit clearance and local scenic trails.</summary>
    public static WorldSiteLandscapeRecipe Generate(WyrmrealmMapNode node, WorldSiteGeography geography)
    {
        ArgumentNullException.ThrowIfNull(node);
        ArgumentNullException.ThrowIfNull(geography);
        var seed = unchecked(geography.WorldSeed * 486187739 + 19);
        foreach (var character in geography.SiteId)
            seed = unchecked(seed * 31 + character);
        var random = new Random(seed);
        var kind = SelectKind(node, geography);
        var mountain = kind is "mountain-pass" or "mountain-monastery";
        var obstacles = new List<WorldSiteObstacle>();
        var count = kind switch
        {
            "forest-fork" => 24,
            "forest-trail" => 19,
            "mountain-pass" => 16,
            "mountain-monastery" => 12,
            "monastery-grounds" => 10,
            "wyrm-lair" => 18,
            _ => 12,
        };
        for (var index = 0; index < count; index++)
        {
            // A mountain has two jagged enclosing ridges; the lair has an outer ring of stone ribs.
            // Forests instead have irregular tree/root masses on both sides of the mapped roads.
            var angle = kind == "wyrm-lair"
                ? (index + random.NextDouble() * .45) * Math.PI * 2 / count
                : random.NextDouble() * Math.PI * 2;
            var side = index % 2 == 0 ? 1d : -1d;
            var center = kind switch
            {
                "mountain-pass" or "mountain-monastery" => new HuntPoint(.5 + side * (.285 + random.NextDouble() * .025),
                    .09 + (index / (double)count) * .82 + (random.NextDouble() - .5) * .11),
                "wyrm-lair" => new HuntPoint(.5 + Math.Cos(angle) * (.32 + random.NextDouble() * .08),
                    .5 + Math.Sin(angle) * (.29 + random.NextDouble() * .1)),
                _ => new HuntPoint(.08 + random.NextDouble() * .84, .07 + random.NextDouble() * .86),
            };
            var radiusX = kind switch
            {
                "mountain-pass" or "mountain-monastery" => .15 + random.NextDouble() * .018,
                "wyrm-lair" => .064 + random.NextDouble() * .045,
                "forest-fork" or "forest-trail" => .052 + random.NextDouble() * .042,
                _ => .045 + random.NextDouble() * .042,
            };
            var radiusY = kind switch
            {
                "mountain-pass" or "mountain-monastery" => .13 + random.NextDouble() * .025,
                "wyrm-lair" => .055 + random.NextDouble() * .047,
                _ => .04 + random.NextDouble() * .045,
            };
            if (center.X - radiusX < .012 || center.X + radiusX > .988 ||
                center.Y - radiusY < .012 || center.Y + radiusY > .988)
                continue;
            if (geography.Corridors.Concat(geography.ScenicPaths).Any(corridor => CorridorDistance(center, corridor.Points) < 
                Math.Max(radiusX, radiusY) + corridor.Width * .5 + .065))
                continue;
            // No player spawn, boss telegraph or obligatory encounter crossing is obstructed.
            if (Math.Abs(center.X - .5) < radiusX + .1 && Math.Abs(center.Y - .5) < radiusY + .11)
                continue;
            var material = kind switch
            {
                "mountain-pass" or "mountain-monastery" or "wyrm-lair" => geography.RegionId == "frost"
                    ? WorldSiteSurfaceId.GlacialIce : WorldSiteSurfaceId.Rock,
                "forest-fork" or "forest-trail" => WorldSiteSurfaceId.Grass,
                _ => geography.Substrate.Material,
            };
            var obstacleKind = kind switch
            {
                "mountain-pass" or "mountain-monastery" => geography.RegionId == "frost" ? "glacier-cliff" : "cliff",
                "wyrm-lair" => geography.RegionId == "frost" ? "ice-spire" : "wyrm-rib",
                "forest-fork" or "forest-trail" => "tree-root",
                _ => "rock",
            };
            var outline = Polygon(center, radiusX, radiusY, random);
            obstacles.Add(new WorldSiteObstacle(obstacleKind, material,
                mountain ? 2.2 : kind == "wyrm-lair" ? 1.4 : .5, outline));
        }
        // Small grounded features flank locally generated paths. The number of
        // Chart edges does not determine how many visible roads the arena draws.
        if (kind is "forest-fork" or "forest-trail" or "mountain-pass" or "mountain-monastery")
            AddNearRoadShoulders(geography, mountain, random, obstacles);
        if (mountain)
            AddMountainAnchors(geography, random, obstacles);
        if (geography.GenerationProfile?.Landmark == WorldSiteLandmark.Monastery)
            AddMonasteryBuilding(geography, obstacles);

        return new WorldSiteLandscapeRecipe(kind, obstacles);
    }

    private static void AddNearRoadShoulders(
        WorldSiteGeography site, bool mountain, Random random, List<WorldSiteObstacle> obstacles)
    {
        foreach (var corridor in site.ScenicPaths)
        {
            if (corridor.Points.Count < 2) continue;
            var from = corridor.Points[0];
            var destination = corridor.Points[^1];
            var dx = destination.X - from.X;
            var dy = destination.Y - from.Y;
            var length = Math.Sqrt(dx * dx + dy * dy);
            if (length < .01) continue;

            // Take the same 35%-65% section in which an actual Hunt's first
            // portrait camera starts. Candidate placement stays entirely in C#.
            var progress = .36 + random.NextDouble() * .22;
            var center = new HuntPoint(from.X + progress * dx, from.Y + progress * dy);
            var offset = mountain ? .19 : .18;
            var radiusX = mountain ? .065 : .045;
            var radiusY = mountain ? .075 : .055;
            foreach (var side in new[] { -1d, 1d })
            {
                var point = new HuntPoint(
                    center.X - dy / length * offset * side,
                    center.Y + dx / length * offset * side);
                if (point.X - radiusX < .02 || point.X + radiusX > .98 ||
                    point.Y - radiusY < .02 || point.Y + radiusY > .98)
                    continue;
                if (site.Corridors.Concat(site.ScenicPaths).Any(route =>
                    CorridorDistance(point, route.Points) < Math.Max(radiusX, radiusY) + route.Width * .5 + .055))
                    continue;
                if (Math.Abs(point.X - .5) < radiusX + .10 &&
                    Math.Abs(point.Y - .5) < radiusY + .11)
                    continue;
                var material = mountain
                    ? site.RegionId == "frost" ? WorldSiteSurfaceId.GlacialIce : WorldSiteSurfaceId.Rock
                    : WorldSiteSurfaceId.Grass;
                var obstacleKind = mountain
                    ? site.RegionId == "frost" ? "glacier-cliff" : "cliff"
                    : "tree-root";
                obstacles.Add(new WorldSiteObstacle(obstacleKind, material,
                    mountain ? 1.5 : .7, Polygon(point, radiusX, radiusY, random)));
            }
        }
    }

    // Tall, physically blocking ridge masses must be present even when a seed
    // has multiple exit-clearance lanes. They are placed in free terrain, never
    // by copying the Chart's graph degree into a fork-shaped mountain road.
    private static void AddMountainAnchors(
        WorldSiteGeography site, Random random, List<WorldSiteObstacle> obstacles)
    {
        var lanes = site.Corridors.Concat(site.ScenicPaths).ToArray();
        var candidates = new[]
        {
            new HuntPoint(.22, .22), new HuntPoint(.78, .22),
            new HuntPoint(.22, .78), new HuntPoint(.78, .78),
            new HuntPoint(.20, .43), new HuntPoint(.80, .43),
            new HuntPoint(.20, .62), new HuntPoint(.80, .62),
            new HuntPoint(.33, .24), new HuntPoint(.67, .24),
        };
        var anchors = candidates.Select(point => new
        {
            Point = point,
            Clearance = lanes.Min(lane => CorridorDistance(point, lane.Points) - lane.Width * .5),
        }).OrderByDescending(candidate => candidate.Clearance).ToArray();
        var selected = new List<HuntPoint>();
        var material = site.RegionId == "frost" ? WorldSiteSurfaceId.GlacialIce : WorldSiteSurfaceId.Rock;
        var kind = site.RegionId == "frost" ? "glacier-cliff" : "cliff";
        foreach (var candidate in anchors)
        {
            if (selected.Count == 4) break;
            if (candidate.Clearance < .055 ||
                selected.Any(point => Math.Sqrt(Math.Pow(point.X - candidate.Point.X, 2) + Math.Pow(point.Y - candidate.Point.Y, 2)) < .19))
                continue;
            var radius = Math.Clamp(candidate.Clearance * .38, .025, .075);
            obstacles.Add(new WorldSiteObstacle(kind, material, 2.3,
                Polygon(candidate.Point, radius, radius * 1.12, random)));
            selected.Add(candidate.Point);
        }
    }

    private static string SelectKind(WyrmrealmMapNode node, WorldSiteGeography geography)
    {
        if (node.Type == WyrmrealmNodeType.Dragon)
            return "wyrm-lair";
        var profile = geography.GenerationProfile;
        if (profile?.Landmark == WorldSiteLandmark.Monastery)
            return profile.Landform == WorldSiteLandform.Mountain ? "mountain-monastery" : "monastery-grounds";
        if (profile?.Landform == WorldSiteLandform.Mountain)
            return "mountain-pass";
        if (node.Habitat is WyrmrealmHabitat.Outskirts or WyrmrealmHabitat.WetForest
            or WyrmrealmHabitat.SnowboundPines or WyrmrealmHabitat.FrozenRoad)
            return geography.ScenicPaths.Count > 1 ? "forest-fork" : "forest-trail";
        return node.Habitat is WyrmrealmHabitat.DesertedVillage or WyrmrealmHabitat.BuriedHamlet
            ? "village-site" : "historic-site";
    }

    // The monastery is a real C# collision layout: a hall and surrounding walls
    // with an open south entrance and navigable courtyard. AR4/AR5 own art/depth.
    private static void AddMonasteryBuilding(WorldSiteGeography site, List<WorldSiteObstacle> obstacles)
    {
        var candidates = new[]
        {
            new HuntPoint(.22, .2), new HuntPoint(.78, .2),
            new HuntPoint(.22, .78), new HuntPoint(.78, .78),
            new HuntPoint(.18, .48), new HuntPoint(.82, .48),
        };
        var best = candidates
            .Select(center => new
            {
                Center = center,
                Clearance = site.Corridors.Concat(site.ScenicPaths)
                    .Min(route => CorridorDistance(center, route.Points) - route.Width * .5),
            })
            .OrderByDescending(candidate => candidate.Clearance)
            .First();
        // A smaller cloister fits narrow routes; never displace mandatory exits.
        var halfWidth = Math.Clamp(best.Clearance * .38, .045, .105);
        var halfHeight = Math.Clamp(best.Clearance * .30, .04, .085);
        var cx = best.Center.X;
        var cy = best.Center.Y;
        var stone = site.RegionId == "frost" ? WorldSiteSurfaceId.GlacialIce : WorldSiteSurfaceId.Rock;
        var left = cx - halfWidth;
        var right = cx + halfWidth;
        var north = cy - halfHeight;
        var south = cy + halfHeight;
        var thickness = Math.Min(.017, halfWidth * .20);
        // Eliminate incidental small rocks/roots on the real structure footprint.
        obstacles.RemoveAll(obstacle => obstacle.Outline.Any(point =>
            point.X > left - .03 && point.X < right + .03 &&
            point.Y > north - .03 && point.Y < south + .03));
        obstacles.Add(new WorldSiteObstacle("monastery-hall", stone, 1.8,
            Rectangle(cx - halfWidth * .63, north + thickness, cx + halfWidth * .63, cy - halfHeight * .1)));
        obstacles.Add(new WorldSiteObstacle("monastery-wall", stone, 1.4,
            Rectangle(left, north, right, north + thickness)));
        obstacles.Add(new WorldSiteObstacle("monastery-wall", stone, 1.4,
            Rectangle(left, north, left + thickness, south)));
        obstacles.Add(new WorldSiteObstacle("monastery-wall", stone, 1.4,
            Rectangle(right - thickness, north, right, south)));
        // Split the southern wall into two real colliders to create an open gate.
        obstacles.Add(new WorldSiteObstacle("monastery-wall", stone, 1.4,
            Rectangle(left, south - thickness, cx - thickness * 1.4, south)));
        obstacles.Add(new WorldSiteObstacle("monastery-wall", stone, 1.4,
            Rectangle(cx + thickness * 1.4, south - thickness, right, south)));
    }

    private static IReadOnlyList<HuntPoint> Rectangle(double left, double top, double right, double bottom) =>
    [
        new HuntPoint(left, top), new HuntPoint(right, top),
        new HuntPoint(right, bottom), new HuntPoint(left, bottom),
    ];

    private static IReadOnlyList<HuntPoint> Polygon(HuntPoint center, double radiusX, double radiusY, Random random)
    {
        const int Sides = 9;
        var offset = random.NextDouble() * .3;
        var outline = new HuntPoint[Sides];
        for (var corner = 0; corner < Sides; corner++)
        {
            var angle = corner * Math.PI * 2 / Sides + offset;
            var reach = .85 + random.NextDouble() * .13;
            outline[corner] = new HuntPoint(center.X + Math.Cos(angle) * radiusX * reach,
                center.Y + Math.Sin(angle) * radiusY * reach);
        }
        return outline;
    }

    private static double CorridorDistance(HuntPoint center, IReadOnlyList<HuntPoint> points)
    {
        var shortest = double.PositiveInfinity;
        for (var index = 1; index < points.Count; index++)
        {
            var from = points[index - 1];
            var to = points[index];
            var dx = to.X - from.X;
            var dy = to.Y - from.Y;
            var squared = dx * dx + dy * dy;
            var t = squared < 1e-9 ? 0 : Math.Clamp(
                ((center.X - from.X) * dx + (center.Y - from.Y) * dy) / squared, 0, 1);
            shortest = Math.Min(shortest, Math.Sqrt(Math.Pow(center.X - from.X - dx * t, 2) +
                Math.Pow(center.Y - from.Y - dy * t, 2)));
        }
        return shortest;
    }
}

/// <summary>Shared exact polygon footprints for C# movement, sight, projectiles and visual snapshots.</summary>
public static class WorldSiteFootprintCollision
{
    /// <summary>True when a swept circle hits an authoritative site footprint.</summary>
    public static bool BlocksSegment(WorldSiteLandscapeRecipe? recipe, Vector2D from, Vector2D to,
        double width, double height, double radius = 0)
    {
        if (recipe is null || width <= 0 || height <= 0) return false;
        // Projectile sweeps and visibility raycasts run on the gameplay hot path.
        // Iterate existing C# polygons without Zip/Skip/Append iterator allocations.
        var radiusSquared = radius * radius;
        foreach (var obstacle in recipe.Obstacles)
        {
            if (Contains(obstacle, from, width, height, radius) ||
                Contains(obstacle, to, width, height, radius))
                return true;
            var outline = obstacle.Outline;
            for (var index = 0; index < outline.Count; index++)
            {
                var a = outline[index];
                var b = outline[(index + 1) % outline.Count];
                if (SegmentsDistanceSquared(from, to,
                    new Vector2D(a.X * width, a.Y * height),
                    new Vector2D(b.X * width, b.Y * height)) <= radiusSquared)
                    return true;
            }
        }
        return false;
    }

    /// <summary>True when a physical point or circle lies inside a site polygon.</summary>
    public static bool Contains(WorldSiteObstacle obstacle, Vector2D position, double width, double height, double radius = 0)
    {
        if (width <= 0 || height <= 0 || obstacle.Outline.Count < 3) return false;
        var x = position.X / width;
        var y = position.Y / height;
        var inside = false;
        for (var index = 0; index < obstacle.Outline.Count; index++)
        {
            var a = obstacle.Outline[index];
            var b = obstacle.Outline[(index + 1) % obstacle.Outline.Count];
            if ((a.Y > y) != (b.Y > y) &&
                x < (b.X - a.X) * (y - a.Y) / (b.Y - a.Y) + a.X)
                inside = !inside;
            if (radius > 0 &&
                PointSegmentDistanceSquared(position,
                    new Vector2D(a.X * width, a.Y * height),
                    new Vector2D(b.X * width, b.Y * height)) <= radius * radius)
                return true;
        }
        return inside;
    }

    private static double PointSegmentDistanceSquared(Vector2D point, Vector2D from, Vector2D to)
    {
        var delta = to - from;
        var squared = delta.X * delta.X + delta.Y * delta.Y;
        var t = squared <= 1e-12 ? 0 : Math.Clamp(((point.X - from.X) * delta.X +
            (point.Y - from.Y) * delta.Y) / squared, 0, 1);
        var closest = point - (from + delta * t);
        return closest.X * closest.X + closest.Y * closest.Y;
    }

    private static double SegmentsDistanceSquared(Vector2D a, Vector2D b, Vector2D c, Vector2D d)
    {
        // Crossed segments have distance zero; otherwise use nearest endpoint-to-segment.
        var ab = b - a;
        var cd = d - c;
        var denominator = ab.X * cd.Y - ab.Y * cd.X;
        if (Math.Abs(denominator) > 1e-10)
        {
            var ac = c - a;
            var s = (ac.X * cd.Y - ac.Y * cd.X) / denominator;
            var t = (ac.X * ab.Y - ac.Y * ab.X) / denominator;
            if (s >= 0 && s <= 1 && t >= 0 && t <= 1) return 0;
        }
        return Math.Min(Math.Min(PointSegmentDistanceSquared(a, c, d),
            PointSegmentDistanceSquared(b, c, d)),
            Math.Min(PointSegmentDistanceSquared(c, a, b), PointSegmentDistanceSquared(d, a, b)));
    }
}
