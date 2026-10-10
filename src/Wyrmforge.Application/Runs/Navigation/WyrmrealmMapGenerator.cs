using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Navigation;

public static class WyrmrealmMapGenerator
{
    public static IReadOnlyList<WyrmrealmMapNode> Generate(int depth, int seed)
    {
        var random = new Random(unchecked(seed * 397 ^ depth * 7919));
        var biome = random.Next(3);
        var river = Enumerable.Range(0, 21).Select(i => new HuntPoint(16 + Math.Sin(i * .48 + seed % 13) * 4, i * 5d)).ToArray();
        var camp = new HuntPoint(7, 96);
        var opening = new HuntPoint(38 + random.NextDouble() * 12, 88);
        var fork = new HuntPoint(42 + random.NextDouble() * 16, 80);
        var clearing = new HuntPoint(40 + random.NextDouble() * 20, 51);
        var approach = new HuntPoint(40 + random.NextDouble() * 20, 17);
        var lair = new HuntPoint(approach.X, 5);
        var roads = new List<HuntRoad>();
        var drafts = new List<WyrmrealmNodeLayout>();
        var crossingX = RiverX(river, 92);
        var bridge = new[] { camp, new HuntPoint(crossingX - 4, 92), new HuntPoint(crossingX + 4, 92), opening };
        Add("opening-1", 1, 0, [], opening, bridge);
        Add("opening-2", 2, 0, [drafts[^1].Id], fork, [opening, fork]);
        var firstEnds = AddRoads(0, fork, clearing, 3, drafts[^1].Id);
        Add("clearing", 5, 0, firstEnds, clearing, []);
        var secondEnds = AddRoads(1, clearing, approach, 6, drafts[^1].Id);
        Add("approach", 8, 0, secondEnds, approach, []);
        Add("wyrm", 9, 0, [drafts[^1].Id], lair, [approach, lair]);
        var trails = drafts.SelectMany(d => d.Site.IncomingTrail.Zip(d.Site.IncomingTrail.Skip(1)))
            .Concat(roads.SelectMany(r => r.Points.Zip(r.Points.Skip(1)))).ToArray();
        var features = new List<HuntFeature> { new("bridge", new(crossingX, 92), 4, .6) };
        // Valleys are reserved before encounter placement. Ridges cannot cover their navigable corridors.
        for (var attempt = 0; attempt < 350 && features.Count < 24; attempt++)
        {
            var point = new HuntPoint(random.NextDouble() * 100, 21 + random.NextDouble() * 62);
            var radiusX = 6 + random.NextDouble() * 9;
            var radiusY = 0.7 + random.NextDouble() * 1.1;
            if (trails.Any(edge => SegmentDistance(point, edge.First, edge.Second, radiusX + 3, radiusY + 1) < 1)) continue;
            if (drafts.Any(d => Distance(point, d.Site.Point, radiusX + 5, radiusY + 2) < 1)) continue;
            features.Add(new("mountain", point, radiusX, radiusY));
        }
        features.Add(new(biome == 2 ? "volcano" : "ridge", new(approach.X, 7), 17, 7));
        foreach (var road in roads.Where(r => r.BonusRelic)) features.Add(new("ruins", road.Points[road.Points.Count / 2], 3, 1));
        var territory = new WyrmrealmTerritory(seed, new[] { "River valley", "Broken ridge", "Ashen caldera" }[biome], camp, river, roads, features);
        var mirror = random.Next(2) == 1;
        HuntPoint Flip(HuntPoint point) => mirror ? point with { X = 100 - point.X } : point;
        territory = territory with { Camp = Flip(camp), River = river.Select(Flip).ToArray(),
            Roads = roads.Select(r => r with { Points = r.Points.Select(Flip).ToArray() }).ToArray(),
            Features = features.Select(f => f with { Center = Flip(f.Center) }).ToArray() };
        return WyrmrealmRouteGenerator.CreateNodes(depth, drafts, new Random(unchecked(seed * 733 ^ depth * 104729)))
            .Select(node =>
            {
                var site = drafts.Single(d => d.Id == node.Id).Site;
                return node with { Site = site with { Point = Flip(site.Point), IncomingTrail = site.IncomingTrail.Select(Flip).ToArray() }, Territory = territory };
            }).ToArray();

        void Add(string suffix, int stage, int lane, IReadOnlyList<string> previous, HuntPoint point, IReadOnlyList<HuntPoint> trail,
            string? roadId = null, int index = 0, bool bonus = false, SpellSchool? school = null)
        {
            drafts.Add(new($"depth-{depth}-{suffix}", stage, lane, previous, WyrmrealmNodeRarity.Common,
                new(point, roadId, index, bonus, trail), school));
        }

        string[] AddRoads(int sector, HuntPoint start, HuntPoint end, int stage, string previousId)
        {
            var count = random.Next(2, 5);
            var schools = Enum.GetValues<SpellSchool>().OrderBy(_ => random.Next()).ToArray();
            var lengths = new List<int> { 2 };
            for (var i = 1; i < count; i++) lengths.Add(random.NextDouble() < .35 ? 2 : random.NextDouble() < .45 ? 5 : 3);
            if (lengths.All(length => length == 2)) lengths[^1] = 3;
            var ends = new List<string>();
            for (var lane = 0; lane < count; lane++)
            {
                var fights = lengths[lane];
                var centerX = 27 + lane * 60d / (count - 1);
                var points = new List<HuntPoint> { start };
                for (var i = 1; i <= fights; i++)
                {
                    var spacingNoise = fights switch { 2 => .18, 3 => .10, _ => .04 };
                    var t = i / (fights + 1d) + (random.NextDouble() - .5) * spacingNoise;
                    var x = centerX + Math.Sin(t * Math.PI * 2 + sector) * 7 + (random.NextDouble() - .5) * 2;
                    var y = start.Y + (end.Y - start.Y) * t + (random.NextDouble() - .5) * 1.4;
                    points.Add(new(Math.Max(x, 26), y));
                }
                points.Add(end);
                var roadId = $"road-{sector}-{lane}";
                var length = fights switch { 2 => "Short", 3 => "Medium", _ => "Long" };
                var name = fights == 5 ? "Ruined spur" : lane == 0 ? "Sheltered valley" : lane == count - 1 ? "Exposed ridge" : "Narrow pass";
                roads.Add(new(roadId, name, length, fights, points, fights == 5));
                var incoming = previousId;
                for (var i = 0; i < fights; i++)
                {
                    var bonus = fights == 5 && i == fights / 2;
                    Add($"sector-{sector}-road-{lane}-stop-{i}", stage + Math.Min(i, 1), lane, [incoming], points[i + 1],
                        [points[i], points[i + 1]], roadId, i, bonus, schools[lane]);
                    incoming = drafts[^1].Id;
                }
                ends.Add(incoming);
            }
            return ends.ToArray();
        }
    }

    public static double RiverX(IReadOnlyList<HuntPoint> river, double y)
    {
        var index = Math.Clamp((int)(y / 5), 0, river.Count - 2);
        var t = (y - river[index].Y) / (river[index + 1].Y - river[index].Y);
        return river[index].X + (river[index + 1].X - river[index].X) * t;
    }

    private static double Distance(HuntPoint point, HuntPoint other, double rx, double ry)
    {
        var dx = (point.X - other.X) / rx;
        var dy = (point.Y - other.Y) / ry;
        return dx * dx + dy * dy;
    }

    public static HuntPoint TrailPoint(HuntPoint a, HuntPoint b, double t)
        => new(a.X + (b.X - a.X) * (3 * t * t - 2 * t * t * t), a.Y + (b.Y - a.Y) * t);

    private static double SegmentDistance(HuntPoint point, HuntPoint a, HuntPoint b, double rx, double ry)
        => Enumerable.Range(0, 41).Min(i => Distance(point, TrailPoint(a, b, i / 40d), rx, ry));
}

internal sealed record WyrmrealmNodeLayout(string Id, int Stage, int Lane, IReadOnlyList<string> PreviousNodeIds,
    WyrmrealmNodeRarity Rarity, HuntSite Site, SpellSchool? School);
