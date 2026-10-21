using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Runs.Navigation;

public static class WyrmrealmMapGenerator
{
    /// <summary>Territory names per region; the layout stream is shared, so a seed draws the same shape in every region.</summary>
    private static readonly string[] FireTerritories = ["River valley", "Broken ridge", "Ashen caldera"];
    private static readonly string[] FrostTerritories = ["Snowbound vale", "Rimewall heights", "Glacier basin"];

    public static IReadOnlyList<WyrmrealmMapNode> Generate(int depth, int seed, SpellSchool region = SpellSchool.Fire)
        => GenerateCore(depth, seed, region, HuntShape.Legacy);

    public static IReadOnlyList<WyrmrealmMapNode> GenerateFireTierOne(int seed) => GenerateFireHunt(seed, WyrmTier.Wyrm);

    /// <summary>Authored Fire ladder routes: Tier I teaches one fork; Tier II adds a second fork and an optional, harder refuge.</summary>
    public static IReadOnlyList<WyrmrealmMapNode> GenerateFireHunt(int seed, WyrmTier tier) => tier switch
    {
        WyrmTier.Wyrm => GenerateCore(1, seed, SpellSchool.Fire, HuntShape.FireTierOne),
        WyrmTier.Ascendant => GenerateCore(1, seed, SpellSchool.Fire, HuntShape.FireTierTwo),
        _ => throw new ArgumentOutOfRangeException(nameof(tier), tier, "Only Fire Tier I and Tier II routes are authored."),
    };

    public const string RefugeName = "Emberwatch Refuge";

    private enum HuntShape { Legacy, FireTierOne, FireTierTwo }

    private static IReadOnlyList<WyrmrealmMapNode> GenerateCore(int depth, int seed, SpellSchool region, HuntShape shape)
    {
        var introductoryFire = shape != HuntShape.Legacy;
        var tierTwo = shape == HuntShape.FireTierTwo;
        var pacing = introductoryFire ? new WyrmrealmHuntLengthProfile(1, 1, 1, 2, 2) : WyrmrealmHuntLengthCatalog.Get(depth);
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
        // Habitat forks are derived from the seed, never drawn from the layout stream, so existing layouts stay identical.
        var habitatBits = HabitatBits(seed, depth);
        Add("opening-1", 1, 0, [], opening, bridge, habitat: WyrmrealmHabitat.Outskirts);
        if (introductoryFire && !tierTwo)
        {
            var ends = AddRoads(0, opening, approach, 2, drafts[^1].Id);
            Add("approach", 4, 0, ends, approach, [], habitat: WyrmrealmHabitat.ScorchedApproach);
        }
        else
        {
            Add("opening-2", 2, 0, [drafts[^1].Id], fork, [opening, fork], habitat: WyrmrealmHabitat.WetForest);
            var firstEnds = AddRoads(0, fork, clearing, 3, drafts[^1].Id);
            Add("clearing", 5, 0, firstEnds, clearing, [], habitat: WyrmrealmHabitat.DesertedVillage);
            var clearingId = drafts[^1].Id;
            string? refugeId = null;
            if (tierTwo)
            {
                // The refuge is a side quest beside the hamlet: a harder hold that rejoins every road of the second fork.
                var refuge = new HuntPoint(clearing.X < 50 ? clearing.X + 24 : clearing.X - 24, clearing.Y - 4);
                Add("refuge", 5, 3, [clearingId], refuge, [clearing, refuge], habitat: WyrmrealmHabitat.DesertedVillage, refuge: true);
                refugeId = drafts[^1].Id;
            }
            var secondEnds = AddRoads(1, clearing, approach, 6, clearingId);
            if (refugeId is not null)
            {
                for (var index = 0; index < drafts.Count; index++)
                {
                    if (drafts[index].Site.RoadId?.StartsWith("road-1-") == true && drafts[index].Site.RoadIndex == 0)
                        drafts[index] = drafts[index] with { PreviousNodeIds = [.. drafts[index].PreviousNodeIds, refugeId] };
                }
            }
            Add("approach", 8, 0, secondEnds, approach, [], habitat: WyrmrealmHabitat.ScorchedApproach);
        }
        Add("wyrm", 9, 0, [drafts[^1].Id], lair, [approach, lair], habitat: WyrmrealmHabitat.Lair);
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
        // The Frost basin ends at a glacier's ridge, never a volcano.
        features.Add(new(biome == 2 && region != SpellSchool.Frost ? "volcano" : "ridge", new(approach.X, 5), 17, 4));
        var territory = new WyrmrealmTerritory(seed, (region == SpellSchool.Frost ? FrostTerritories : FireTerritories)[biome], camp, river, roads, features);
        var mirror = random.Next(2) == 1;
        HuntPoint Flip(HuntPoint point) => mirror ? point with { X = 100 - point.X } : point;
        territory = territory with { Camp = Flip(camp), River = river.Select(Flip).ToArray(),
            Roads = roads.Select(r => r with { Points = r.Points.Select(Flip).ToArray() }).ToArray(),
            Features = features.Select(f => f with { Center = Flip(f.Center) }).ToArray() };
        var created = WyrmrealmRouteGenerator.CreateNodes(tierTwo ? 2 : depth, drafts, new Random(unchecked(seed * 733 ^ depth * 104729))).ToArray();
        var lairRoads = created.Where(node => node.Type == WyrmrealmNodeType.Dragon).SelectMany(node => node.PreviousNodeIds).ToHashSet(StringComparer.Ordinal);
        return created
            .Select(node =>
            {
                var draft = drafts.Single(d => d.Id == node.Id);
                var site = draft.Site;
                var name = introductoryFire && node.Type == WyrmrealmNodeType.Dragon ? DragonCatalog.Get(DragonId.Ashfang).Name
                    : draft.Refuge ? RefugeName : node.Name;
                return node with { Name = name, Refuge = draft.Refuge,
                    Site = site with { Point = Flip(site.Point), IncomingTrail = site.IncomingTrail.Select(Flip).ToArray() },
                    Territory = territory, Habitat = WyrmrealmHabitatCatalog.ForSchool(draft.Habitat, region), PreLair = node.Type == WyrmrealmNodeType.Combat && lairRoads.Contains(node.Id) };
            }).ToArray();

        void Add(string suffix, int stage, int lane, IReadOnlyList<string> previous, HuntPoint point, IReadOnlyList<HuntPoint> trail,
            string? roadId = null, int index = 0, bool bonus = false, SpellSchool? school = null, WyrmrealmHabitat habitat = WyrmrealmHabitat.Outskirts,
            bool refuge = false)
        {
            drafts.Add(new($"depth-{depth}-{suffix}", stage, lane, previous, refuge ? WyrmrealmNodeRarity.Rare : WyrmrealmNodeRarity.Common,
                new(point, roadId, index, bonus, trail), introductoryFire ? SpellSchool.Fire : school, habitat, refuge));
        }

        string[] AddRoads(int sector, HuntPoint start, HuntPoint end, int stage, string previousId)
        {
            var count = random.Next(2, pacing.MaximumRoadChoices + 1);
            var schools = Enum.GetValues<SpellSchool>().OrderBy(_ => random.Next()).ToArray();
            var lengths = new List<int> { pacing.ShortRoadEncounters };
            for (var i = 1; i < count; i++) lengths.Add(random.NextDouble() < .35 ? pacing.ShortRoadEncounters : random.NextDouble() < .45 ? pacing.LongRoadEncounters : pacing.MediumRoadEncounters);
            if (lengths.All(length => length == pacing.ShortRoadEncounters)) lengths[^1] = introductoryFire ? pacing.LongRoadEncounters : pacing.MediumRoadEncounters;
            var ends = new List<string>();
            for (var lane = 0; lane < count; lane++)
            {
                var fights = lengths[lane];
                var centerX = 26 + lane * 60d / (count - 1);
                var bendRoom = Math.Min(12, (60d / (count - 1) - 16) / 2);
                var bend = random.NextDouble() * Math.PI * 2;
                var points = new List<HuntPoint> { start };
                for (var i = 1; i <= fights; i++)
                {
                    var spacingNoise = fights switch { 2 => .18, 3 => .10, _ => .04 };
                    var t = i / (fights + 1d) + (random.NextDouble() - .5) * spacingNoise;
                    // Reserve touch-sized corridors across neighbouring roads, while varying each bend and stop's height.
                    var bendOffset = Math.Sin(t * Math.PI * 2 + bend) * bendRoom;
                    var x = centerX + Math.Clamp(bendOffset + (random.NextDouble() - .5) * 3, -bendRoom, bendRoom);
                    var y = start.Y + (end.Y - start.Y) * t + (random.NextDouble() - .5) * 1.4;
                    if (i > 1) y = Math.Min(y, points[^1].Y - 3.3);
                    points.Add(new(Math.Clamp(x, 26, 88), y));
                }
                points.Add(end);
                var roadId = $"road-{sector}-{lane}";
                var length = fights == pacing.ShortRoadEncounters ? "Short" : fights == pacing.MediumRoadEncounters ? "Medium" : "Long";
                var hasDetourReward = fights == pacing.LongRoadEncounters;
                var roadHabitat = RoadHabitat(sector, lane, count, habitatBits);
                var name = WyrmrealmHabitatCatalog.RoadName(WyrmrealmHabitatCatalog.ForSchool(roadHabitat, region));
                roads.Add(new(roadId, name, length, fights, points, hasDetourReward));
                var incoming = previousId;
                for (var i = 0; i < fights; i++)
                {
                    var bonus = hasDetourReward && i == fights / 2;
                    Add($"sector-{sector}-road-{lane}-stop-{i}", stage + Math.Min(i, 1), lane, [incoming], points[i + 1],
                        [points[i], points[i + 1]], roadId, i, bonus, schools[lane], StopHabitat(sector, i, roadHabitat));
                    incoming = drafts[^1].Id;
                }
                ends.Add(incoming);
            }
            if (introductoryFire) return ends.ToArray();
            // Cross trails run uphill between neighbouring roads; they never skip a road's first fight
            // or its reward stop. Advancing exactly one stop preserves the quick route's length.
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
                                          && (lengths[toLane] != pacing.LongRoadEncounters || destination.Site.RoadIndex <= lengths[toLane] / 2)
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

    private static int HabitatBits(int seed, int depth) => (int)((unchecked((uint)seed * 2654435761u ^ (uint)depth * 40503u) >> 13) & 3);

    /// <summary>
    /// First fork: forest trail OR open field (a middle road becomes a dead hamlet).
    /// Second fork: monastery grounds OR flooded cloister. Seed bits decide which side gets which.
    /// </summary>
    public static WyrmrealmHabitat RoadHabitat(int sector, int lane, int laneCount, int habitatBits)
    {
        var swap = ((habitatBits >> sector) & 1) == 1;
        var last = lane == laneCount - 1;
        if (sector == 0)
        {
            if (lane == 0 || last) return (lane == 0) ^ swap ? WyrmrealmHabitat.WetForest : WyrmrealmHabitat.OpenField;
            return WyrmrealmHabitat.DesertedVillage;
        }
        return (lane % 2 == 0) ^ swap ? WyrmrealmHabitat.FloodedCloister : WyrmrealmHabitat.MonasteryGrounds;
    }

    // A long late road climbs out of the cloisters into the burnt country before the lair.
    private static WyrmrealmHabitat StopHabitat(int sector, int stopIndex, WyrmrealmHabitat road)
        => sector == 1 && stopIndex >= 3 ? WyrmrealmHabitat.ScorchedApproach : road;

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
    WyrmrealmNodeRarity Rarity, HuntSite Site, SpellSchool? School, WyrmrealmHabitat Habitat = WyrmrealmHabitat.Outskirts, bool Refuge = false);
