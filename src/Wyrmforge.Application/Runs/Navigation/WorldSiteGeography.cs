using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Navigation;

/// <summary>A semantic surface identifier. Visual debug palettes never enter the authoritative world state.</summary>
public enum WorldSiteSurfaceId
{
    Soil,
    Grass,
    Road,
    Mud,
    Rock,
    ShallowWater,
    GlacialIce,
}

/// <summary>Non-visual geographic properties, independent of a particular render material or palette.</summary>
public sealed record WorldSiteSurface(
    WorldSiteSurfaceId Material,
    double Height,
    double Slope,
    double Moisture,
    double Wear,
    double Shelter);

/// <summary>Broad topography requested by the Chart, not an arena road layout.</summary>
public enum WorldSiteLandform { Lowland, Wetland, Mountain }

/// <summary>A required physical point of interest, independently composable with landform.</summary>
public enum WorldSiteLandmark { None, Monastery, Village, Watchtower, WyrmLair }

/// <summary>Site-generation input: the Chart describes the place; C# generates its local terrain.</summary>
public sealed record WorldSiteGenerationProfile(WorldSiteLandform Landform, WorldSiteLandmark Landmark);

/// <summary>A directed incidence of a world-graph edge on the site's normalized local boundary.</summary>
public sealed record WorldSitePort(
    string EdgeId,
    string NeighborNodeId,
    bool Entrance,
    string Direction,
    HuntPoint LocalPoint);

/// <summary>One mandatory, non-colliding AR0 route corridor; C# remains authoritative for physical barriers.</summary>
public sealed record WorldSiteCorridor(
    string EdgeId,
    WorldSiteSurfaceId Material,
    double Width,
    IReadOnlyList<HuntPoint> Points);

/// <summary>Persistent site identity and topology consumed by both the Chart and the playable arena snapshot.</summary>
public sealed record WorldSiteGeography(
    int Version,
    int WorldSeed,
    string RegionId,
    string SiteId,
    string Archetype,
    HuntPoint ChartCenter,
    WorldSiteSurface Substrate,
    IReadOnlyList<WorldSitePort> Ports,
    IReadOnlyList<WorldSiteCorridor> Corridors,
    IReadOnlyList<string> MandatoryLandmarks)
{
    public const int CurrentVersion = 1;

    /// <summary>Authoritative C# site footprints, independent of visual palette.</summary>
    public WorldSiteLandscapeRecipe? Landscape { get; init; }

    /// <summary>Broad landform and landmark metadata, independent of graph branching.</summary>
    public WorldSiteGenerationProfile? GenerationProfile { get; init; }

    /// <summary>Locally generated visible trails; world-graph corridors remain clearance/exit constraints.</summary>
    public IReadOnlyList<WorldSiteCorridor> ScenicPaths { get; init; } = [];
}

/// <summary>
/// Projects the existing Wyrmrealm graph into a local site frame. This is an adaptation of the
/// existing map generator, not another random generator or a new gameplay authority.
/// </summary>
public static class WorldSiteGeographyProjection
{
    /// <summary>Attaches immutable site descriptors without consuming the Hunt, encounter or reward RNG.</summary>
    public static IReadOnlyList<WyrmrealmMapNode> Attach(
        IReadOnlyList<WyrmrealmMapNode> nodes, int worldSeed, SpellSchool region)
    {
        ArgumentNullException.ThrowIfNull(nodes);
        var byId = nodes.ToDictionary(node => node.Id, StringComparer.Ordinal);
        var forward = nodes.SelectMany(node => node.PreviousNodeIds.Select(previous => (Previous: previous, Next: node.Id)))
            .GroupBy(edge => edge.Previous, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.Select(edge => edge.Next).ToArray(), StringComparer.Ordinal);

        return nodes.Select(node =>
        {
            if (node.Site is null)
                throw new InvalidOperationException($"World site {node.Id} has no chart position.");

            var neighbors = node.PreviousNodeIds.Select(id => (Id: id, Entrance: true))
                .Concat(forward.GetValueOrDefault(node.Id, []).Select(id => (Id: id, Entrance: false)))
                .ToList();

            // The entry camp is part of chart geography, but is not an encounter node.
            if (node.PreviousNodeIds.Count == 0)
                neighbors.Insert(0, ("camp", true));

            var ports = neighbors.Select(connection =>
            {
                var other = connection.Id == "camp"
                    ? node.Territory?.Camp ?? throw new InvalidOperationException("A chart entry needs its camp.")
                    : byId.TryGetValue(connection.Id, out var next) && next.Site is not null
                        ? next.Site.Point
                        : throw new InvalidOperationException($"World site {node.Id} has an unknown graph edge {connection.Id}.");
                var edgeId = string.CompareOrdinal(node.Id, connection.Id) < 0
                    ? $"{node.Id}|{connection.Id}"
                    : $"{connection.Id}|{node.Id}";
                var dx = other.X - node.Site.Point.X;
                var dy = other.Y - node.Site.Point.Y;
                var magnitude = Math.Max(Math.Abs(dx), Math.Abs(dy));
                if (magnitude < 0.0001)
                    throw new InvalidOperationException($"World graph edge {edgeId} has no direction.");
                var position = new HuntPoint(.5 + .44 * dx / magnitude, .5 + .44 * dy / magnitude);
                return new WorldSitePort(edgeId, connection.Id, connection.Entrance,
                    Compass(dx, dy), position);
            }).ToArray();

            if (ports.Select(port => port.EdgeId).Distinct(StringComparer.Ordinal).Count() != ports.Length)
                throw new InvalidOperationException($"World site {node.Id} has duplicate graph incidences.");

            var substrate = Substrate(node.Habitat);
            var corridors = ports.Select(port => new WorldSiteCorridor(port.EdgeId, WorldSiteSurfaceId.Road, .09,
                [new HuntPoint(.5, .5), port.LocalPoint])).ToArray();
            var landmarks = node.Type == WyrmrealmNodeType.Dragon ? region == SpellSchool.Frost
                ? new[] { "wyrm-lair", "glacier-throne" }
                : new[] { "wyrm-lair", "ashen-spine" }
                : node.Refuge ? ["reclaimable-refuge"]
                : node.Watchtower ? ["scouting-watchtower"]
                : node.PreLair ? ["lair-approach"]
                : Array.Empty<string>();

            var geography = new WorldSiteGeography(
                WorldSiteGeography.CurrentVersion,
                worldSeed,
                region.ToString().ToLowerInvariant(),
                $"{region.ToString().ToLowerInvariant()}:{node.Id}",
                node.Habitat.ToString(),
                node.Site.Point,
                substrate,
                ports,
                corridors,
                landmarks);
            var profile = node.GenerationProfile ?? new WorldSiteGenerationProfile(
                WorldSiteLandform.Lowland, WorldSiteLandmark.None);
            geography = geography with
            {
                GenerationProfile = profile,
                ScenicPaths = CreateScenicPaths(worldSeed, geography.SiteId, profile, geography.Ports),
            };
            var landscape = WorldSiteLandscapeGenerator.Generate(node, geography);
            var localSurface = landscape.Kind switch
            {
                "forest-fork" or "forest-trail" => substrate with
                {
                    Material = WorldSiteSurfaceId.Grass, Moisture = .72, Shelter = .7, Slope = .08,
                },
                "mountain-pass" or "mountain-monastery" => substrate with
                {
                    Material = WorldSiteSurfaceId.Rock, Height = .72, Slope = .62, Moisture = .21,
                },
                "wyrm-lair" => substrate with
                {
                    Material = region == SpellSchool.Frost ? WorldSiteSurfaceId.GlacialIce : WorldSiteSurfaceId.Rock,
                    Height = .57, Slope = .26, Wear = .65,
                },
                _ => substrate,
            };
            geography = geography with { Landscape = landscape, Substrate = localSurface };
            return node with { Geography = geography };
        }).ToArray();
    }

    // Visible trails follow the site's seeded landform, not the number/directions
    // of Chart edges. Ports still determine actual reachable destinations.
    private static IReadOnlyList<WorldSiteCorridor> CreateScenicPaths(
        int worldSeed, string siteId, WorldSiteGenerationProfile profile, IReadOnlyList<WorldSitePort> ports)
    {
        var seed = unchecked(worldSeed * 16777619 + 216613626);
        foreach (var character in siteId)
            seed = unchecked(seed * 31 + character);
        var random = new Random(seed);
        var material = profile.Landform == WorldSiteLandform.Wetland
            ? WorldSiteSurfaceId.Mud : WorldSiteSurfaceId.Road;
        var center = new HuntPoint(.5, .5);

        // Chart connections are travel permissions, not physical roads. The
        // landscape owns one believable regional trail regardless of graph degree;
        // only real site destinations may introduce additional paths.
        if (profile.Landform == WorldSiteLandform.Mountain &&
            profile.Landmark == WorldSiteLandmark.Monastery)
        {
            // Enter from the low southern valley, meander gently uphill, and
            // join the separately authored switchback to the monastery gate.
            var swing = (random.Next(2) == 0 ? -1 : 1) * (.032 + random.NextDouble() * .012);
            var ascent = Enumerable.Range(0, 25)
                .Select(index =>
                {
                    var t = index / 24d;
                    return new HuntPoint(.5 + swing * Math.Sin(t * Math.PI * 2), .965 - .465 * t);
                })
                .ToArray();
            return [new WorldSiteCorridor("site-main-trail", material, .04, ascent)];
        }

        var entry = ports.FirstOrDefault(port => port.Entrance) ?? ports.FirstOrDefault();
        var exit = ports.FirstOrDefault(port => !port.Entrance && port.EdgeId != entry?.EdgeId);
        var from = entry?.LocalPoint ?? new HuntPoint(.5, .965);
        // A terminal site may lie on a regional route even if the abstract
        // Chart has no next node. Continue to the opposite map boundary.
        var to = exit?.LocalPoint ?? new HuntPoint(
            Math.Clamp(1 - from.X, .025, .975), Math.Clamp(1 - from.Y, .025, .975));

        return [new WorldSiteCorridor("site-main-trail", material, .06,
        [
            from,
            TrailBend(from, center, (random.NextDouble() - .5) * .16),
            center,
            TrailBend(center, to, (random.NextDouble() - .5) * .16),
            to,
        ])];
    }

    private static HuntPoint TrailBend(HuntPoint from, HuntPoint to, double offset) =>
        new(Math.Clamp((from.X + to.X) * .5 - (to.Y - from.Y) * offset, .025, .975),
            Math.Clamp((from.Y + to.Y) * .5 + (to.X - from.X) * offset, .025, .975));

    private static string Compass(double dx, double dy)
    {
        if (Math.Abs(dx) <= Math.Abs(dy) * .4142135623730951)
            return dy < 0 ? "N" : "S";
        if (Math.Abs(dy) <= Math.Abs(dx) * .4142135623730951)
            return dx < 0 ? "W" : "E";
        return $"{(dy < 0 ? "N" : "S")}{(dx < 0 ? "W" : "E")}";
    }

    private static WorldSiteSurface Substrate(WyrmrealmHabitat habitat) => habitat switch
    {
        WyrmrealmHabitat.WetForest or WyrmrealmHabitat.SnowboundPines
            => new(WorldSiteSurfaceId.Grass, .1, .06, .75, .1, .8),
        WyrmrealmHabitat.FloodedCloister or WyrmrealmHabitat.MirrorMere
            => new(WorldSiteSurfaceId.Mud, .02, .01, .95, .25, .3),
        WyrmrealmHabitat.Lair or WyrmrealmHabitat.GlacierLair or WyrmrealmHabitat.GlacierApproach
            or WyrmrealmHabitat.ScorchedApproach or WyrmrealmHabitat.CairnBarrows
            => new(WorldSiteSurfaceId.Rock, .6, .5, .2, .4, .15),
        WyrmrealmHabitat.OpenField or WyrmrealmHabitat.WhiteoutPlain
            => new(WorldSiteSurfaceId.Grass, .08, .02, .35, .2, .1),
        _ => new(WorldSiteSurfaceId.Soil, .15, .1, .4, .35, .2),
    };
}
