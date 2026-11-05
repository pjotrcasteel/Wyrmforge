using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Navigation;

/// <summary>How far a Wyrm's magic has transformed its land. Generic across schools; each school names the bands in its profile.</summary>
public enum WyrmInfluenceBand { Natural, Tainted, Ravaged, Domain }

/// <summary>Band thresholds and display names for one Wyrm's school. Schools add data here, never a new generator.</summary>
public sealed record WyrmInfluenceProfile(SpellSchool School, IReadOnlyList<double> UpperBounds, IReadOnlyList<string> Names)
{
    /// <summary>Wet Forest, Scorched Forest, Burning Forest, Volcanic Devastation. Thresholds are tunable.</summary>
    public static WyrmInfluenceProfile Fire { get; } = new(SpellSchool.Fire, [.25, .55, .85],
        ["Wet Forest", "Scorched Forest", "Burning Forest", "Volcanic Devastation"]);

    public static WyrmInfluenceProfile For(SpellSchool school) => school == SpellSchool.Fire ? Fire
        : new(school, Fire.UpperBounds, ["Untouched", "Tainted", "Ravaged", "Domain"]);

    public WyrmInfluenceBand Band(double influence)
    {
        var clamped = double.IsFinite(influence) ? Math.Clamp(influence, 0, 1) : 0;
        for (var band = 0; band < UpperBounds.Count; band++)
            if (clamped < UpperBounds[band]) return (WyrmInfluenceBand)band;
        return WyrmInfluenceBand.Domain;
    }

    public string Name(double influence) => Names[(int)Band(influence)];
}

/// <summary>
/// One authoritative influence value per map node: 0 at the entrance, 1 at the lair, strictly increasing along every legal route.
/// Optional side sites (refuge, watchtower) share their hub's value so taking one never changes the land.
/// </summary>
public static class WyrmInfluenceField
{
    public static IReadOnlyList<WyrmrealmMapNode> Assign(IReadOnlyList<WyrmrealmMapNode> nodes)
    {
        ArgumentNullException.ThrowIfNull(nodes);
        var main = nodes.Where(node => !IsSideSite(node)).ToDictionary(node => node.Id, StringComparer.Ordinal);
        var next = main.Values.ToDictionary(node => node.Id, _ => new List<string>(), StringComparer.Ordinal);
        foreach (var node in main.Values)
            foreach (var previous in node.PreviousNodeIds)
                if (next.TryGetValue(previous, out var successors)) successors.Add(node.Id);

        var fromEntrance = new Dictionary<string, int>(StringComparer.Ordinal);
        var toLair = new Dictionary<string, int>(StringComparer.Ordinal);
        int FromEntrance(string id) => fromEntrance.TryGetValue(id, out var known) ? known
            : fromEntrance[id] = main[id].PreviousNodeIds.Where(main.ContainsKey).Select(previous => FromEntrance(previous) + 1).DefaultIfEmpty(0).Max();
        int ToLair(string id) => toLair.TryGetValue(id, out var known) ? known
            : toLair[id] = next[id].Select(successor => ToLair(successor) + 1).DefaultIfEmpty(0).Max();

        var influence = main.Keys.ToDictionary(id => id, id =>
        {
            var behind = FromEntrance(id);
            var ahead = ToLair(id);
            return behind + ahead == 0 ? 0d : Math.Round((double)behind / (behind + ahead), 4);
        }, StringComparer.Ordinal);

        return nodes.Select(node => node with
        {
            Influence = influence.TryGetValue(node.Id, out var value) ? value
                : node.PreviousNodeIds.Where(influence.ContainsKey).Select(previous => influence[previous]).DefaultIfEmpty(0).Max(),
        }).ToArray();
    }

    private static bool IsSideSite(WyrmrealmMapNode node) => node.Refuge || node.Watchtower;
}
