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
}

/// <summary>Non-visual geographic properties, independent of a particular render material or palette.</summary>
public sealed record WorldSiteSurface(
    WorldSiteSurfaceId Material,
    double Height,
    double Slope,
    double Moisture,
    double Wear,
    double Shelter);

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
            var landmarks = node.Type == WyrmrealmNodeType.Dragon ? new[] { "wyrm-lair" }
                : node.Refuge ? ["reclaimable-refuge"]
                : node.Watchtower ? ["scouting-watchtower"]
                : node.PreLair ? ["lair-approach"]
                : Array.Empty<string>();

            return node with
            {
                Geography = new WorldSiteGeography(
                    WorldSiteGeography.CurrentVersion,
                    worldSeed,
                    region.ToString().ToLowerInvariant(),
                    $"{region.ToString().ToLowerInvariant()}:{node.Id}",
                    node.Habitat.ToString(),
                    node.Site.Point,
                    substrate,
                    ports,
                    corridors,
                    landmarks),
            };
        }).ToArray();
    }

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
