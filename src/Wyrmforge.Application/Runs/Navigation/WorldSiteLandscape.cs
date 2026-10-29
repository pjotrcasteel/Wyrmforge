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

/// <summary>Deterministic site composition from the canonical route graph, without using combat or reward RNG.</summary>
public static class WorldSiteLandscapeGenerator
{
    /// <summary>Produces bounded forest, ridge and lair footprints while reserving every mapped route corridor.</summary>
    public static WorldSiteLandscapeRecipe Generate(WyrmrealmMapNode node, WorldSiteGeography geography)
    {
        ArgumentNullException.ThrowIfNull(node);
        ArgumentNullException.ThrowIfNull(geography);
        var kind = SelectKind(node, geography);
        var seed = unchecked(geography.WorldSeed * 486187739 + 19);
        foreach (var character in geography.SiteId)
            seed = unchecked(seed * 31 + character);
        var random = new Random(seed);
        var obstacles = new List<WorldSiteObstacle>();
        var count = kind switch
        {
            "forest-fork" => 24,
            "forest-trail" => 19,
            "mountain-pass" => 16,
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
                "mountain-pass" => new HuntPoint(.5 + side * (.285 + random.NextDouble() * .025),
                    .09 + (index / (double)count) * .82 + (random.NextDouble() - .5) * .11),
                "wyrm-lair" => new HuntPoint(.5 + Math.Cos(angle) * (.32 + random.NextDouble() * .08),
                    .5 + Math.Sin(angle) * (.29 + random.NextDouble() * .1)),
                _ => new HuntPoint(.08 + random.NextDouble() * .84, .07 + random.NextDouble() * .86),
            };
            var radiusX = kind switch
            {
                "mountain-pass" => .15 + random.NextDouble() * .018,
                "wyrm-lair" => .064 + random.NextDouble() * .045,
                "forest-fork" or "forest-trail" => .052 + random.NextDouble() * .042,
                _ => .045 + random.NextDouble() * .042,
            };
            var radiusY = kind switch
            {
                "mountain-pass" => .13 + random.NextDouble() * .025,
                "wyrm-lair" => .055 + random.NextDouble() * .047,
                _ => .04 + random.NextDouble() * .045,
            };
            if (center.X - radiusX < .012 || center.X + radiusX > .988 ||
                center.Y - radiusY < .012 || center.Y + radiusY > .988)
                continue;
            if (geography.Corridors.Any(corridor => CorridorDistance(center, corridor.Points) < 
                Math.Max(radiusX, radiusY) + corridor.Width * .5 + .065))
                continue;
            // No player spawn, boss telegraph or obligatory encounter crossing is obstructed.
            if (Math.Abs(center.X - .5) < radiusX + .1 && Math.Abs(center.Y - .5) < radiusY + .11)
                continue;
            var material = kind switch
            {
                "mountain-pass" or "wyrm-lair" => geography.RegionId == "frost"
                    ? WorldSiteSurfaceId.GlacialIce : WorldSiteSurfaceId.Rock,
                "forest-fork" or "forest-trail" => WorldSiteSurfaceId.Grass,
                _ => geography.Substrate.Material,
            };
            var obstacleKind = kind switch
            {
                "mountain-pass" => geography.RegionId == "frost" ? "glacier-cliff" : "cliff",
                "wyrm-lair" => geography.RegionId == "frost" ? "ice-spire" : "wyrm-rib",
                "forest-fork" or "forest-trail" => "tree-root",
                _ => "rock",
            };
            var outline = Polygon(center, radiusX, radiusY, random);
            obstacles.Add(new WorldSiteObstacle(obstacleKind, material,
                kind == "mountain-pass" ? 2.2 : kind == "wyrm-lair" ? 1.4 : .5, outline));
        }
        return new WorldSiteLandscapeRecipe(kind, obstacles);
    }

    private static string SelectKind(WyrmrealmMapNode node, WorldSiteGeography geography)
    {
        if (node.Type == WyrmrealmNodeType.Dragon) return "wyrm-lair";
        if (node.Habitat is WyrmrealmHabitat.ScorchedApproach or WyrmrealmHabitat.GlacierApproach ||
            node.Territory?.Name.Contains("ridge", StringComparison.OrdinalIgnoreCase) == true ||
            node.Territory?.Name.Contains("heights", StringComparison.OrdinalIgnoreCase) == true)
            return "mountain-pass";
        var forward = geography.Ports.Count(port => !port.Entrance);
        if (forward >= 2 && node.Habitat is WyrmrealmHabitat.Outskirts or WyrmrealmHabitat.WetForest or WyrmrealmHabitat.SnowboundPines)
            return "forest-fork";
        return node.Habitat is WyrmrealmHabitat.Outskirts or WyrmrealmHabitat.WetForest or WyrmrealmHabitat.SnowboundPines
            ? "forest-trail" : "historic-site";
    }

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
        return recipe.Obstacles.Any(obstacle =>
            Contains(obstacle, from, width, height, radius) ||
            Contains(obstacle, to, width, height, radius) ||
            obstacle.Outline.Zip(obstacle.Outline.Skip(1).Append(obstacle.Outline[0]))
                .Any(edge => SegmentsDistanceSquared(from, to,
                    new Vector2D(edge.First.X * width, edge.First.Y * height),
                    new Vector2D(edge.Second.X * width, edge.Second.Y * height)) <= radius * radius));
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
