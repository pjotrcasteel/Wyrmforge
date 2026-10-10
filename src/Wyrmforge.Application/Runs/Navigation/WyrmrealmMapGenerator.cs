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
        var trails = drafts.SelectMany(d => d.PreviousNodeIds.Select(id => (First: drafts.Single(p => p.Id == id).Site.Point, Second: d.Site.Point)))
            .Concat(drafts.SelectMany(d => d.Site.IncomingTrail.Zip(d.Site.IncomingTrail.Skip(1))))
            .Concat(roads.SelectMany(r => r.Points.Zip(r.Points.Skip(1)))).ToArray();
        var features = new List<HuntFeature> { new("bridge", new(crossingX, 92), 4, .6) };
        foreach (var road in roads.Where(r => r.BonusRelic))
        {
            var reward = road.Points[road.Points.Count / 2];
            var side = reward.X < 50 ? -1 : 1;
            var ruin = new HuntPoint(Math.Clamp(reward.X + side * 14, 7, 93), reward.Y);
            if (Math.Abs(ruin.X - RiverX(river, ruin.Y)) < 9) ruin = new(Math.Clamp(reward.X - side * 14, 7, 93), reward.Y);
            features.Add(new("ruins", ruin, 5, 1.8));
        }
        // Valleys are reserved before encounter placement. Ridges cannot cover their navigable corridors.
        for (var attempt = 0; attempt < 350 && features.Count < 18; attempt++)
        {
            var point = new HuntPoint(random.NextDouble() * 100, 21 + random.NextDouble() * 62);
            var radiusX = 5 + random.NextDouble() * 5;
            var radiusY = 1.8 + random.NextDouble() * .8;
            if (Math.Abs(point.X - RiverX(river, point.Y)) < radiusX + 5) continue;
            if (features.Any(f => Distance(point, f.Center, radiusX + f.RadiusX + 2, radiusY + f.RadiusY + 1) < 1)) continue;
            if (trails.Any(edge => SegmentDistance(point, edge.First, edge.Second, radiusX + 3, radiusY + 1) < 1)) continue;
            if (drafts.Any(d => Distance(point, d.Site.Point, radiusX + 5, radiusY + 2) < 1)) continue;
            var kind = biome switch { 0 when attempt % 3 != 0 => "forest", 2 when attempt % 3 != 0 => "rocks", _ => "mountain" };
            features.Add(new(kind, point, radiusX, radiusY));
        }
        features.Add(new(biome == 2 ? "volcano" : "ridge", new(approach.X, 5), 17, 4));
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
                var centerX = 29 + lane * 53d / (count - 1) + (random.NextDouble() - .5) * 7;
                var bend = random.NextDouble() * Math.PI * 2;
                var points = new List<HuntPoint> { start };
                for (var i = 1; i <= fights; i++)
                {
                    var spacingNoise = fights switch { 2 => .18, 3 => .10, _ => .04 };
                    var t = i / (fights + 1d) + (random.NextDouble() - .5) * spacingNoise;
                    var x = centerX + Math.Sin(t * Math.PI * 2 + bend) * 9 + (random.NextDouble() - .5) * 5;
                    var y = start.Y + (end.Y - start.Y) * t + (random.NextDouble() - .5) * 1.4;
                    points.Add(new(Math.Clamp(x, 26, 85), y));
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
            // Cross trails run uphill between neighbouring roads; they never skip a road's first fight
            // or its reward stop. Equal-or-greater stop indices preserve the quick route's length.
            var sectorNodes = drafts.Where(d => d.Site.RoadId?.StartsWith($"road-{sector}-") == true).ToArray();
            for (var lane = 0; lane < count - 1; lane++)
            {
                foreach (var direction in new[] { 1, -1 })
                {
                    var fromLane = direction == 1 ? lane : lane + 1;
                    var toLane = direction == 1 ? lane + 1 : lane;
                    var candidates = (from source in sectorNodes.Where(d => d.Lane == fromLane)
                                      from destination in sectorNodes.Where(d => d.Lane == toLane)
                                      where destination.Site.RoadIndex == source.Site.RoadIndex + 1
                                          && destination.Site.Point.Y < source.Site.Point.Y - 1.5
                                          && (lengths[toLane] != 5 || destination.Site.RoadIndex <= 2)
                                      select (source, destination)).ToArray();
                    if (candidates.Length == 0) continue;
                    var link = candidates[random.Next(candidates.Length)];
                    var index = drafts.FindIndex(d => d.Id == link.destination.Id);
                    drafts[index] = link.destination with { PreviousNodeIds = [.. drafts[index].PreviousNodeIds, link.source.Id] };
                }
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
