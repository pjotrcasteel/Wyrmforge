using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>What the watchtower confirmed about one trail of the next fork.</summary>
public sealed record TrailScoutReport(string NodeId, bool Elite);

/// <summary>
/// Earned scouting (canon hunts-and-world §6.3). Holding the Tier III watchtower replays the same seeded rolls the next
/// fork will make, so its report is the truth rather than a guess: a reported elite always walks in early. The replay keeps
/// the Reliquary and bell rules (they suppress elites), though the crossroads before the tower already takes any pending Reliquary.
/// Nothing is revealed without the detour.
/// </summary>
public sealed partial class RunSimulation
{
    private readonly Dictionary<string, TrailScoutReport> scoutReports = new(StringComparer.Ordinal);

    public IReadOnlyDictionary<string, TrailScoutReport> ScoutReports => scoutReports;

    private void TryScoutFromWatchtower(WyrmrealmMapNode tower)
    {
        if (!tower.Watchtower || SelectedHunt is not { HasWatchtower: true }) return;
        scoutReports.Clear();
        var map = (mapState.Seed, depthState.Depth);
        var elitesSoFar = eliteMap == map ? elitesThisMap : 0;
        var reliquaryPending = reliquaryMap == map ? reliquaryMapPending : IsReliquaryHunt(map.Seed, map.Depth);
        var roadIds = mapState.Nodes.Where(node => node.PreviousNodeIds.Contains(tower.Id)).Select(node => node.Site?.RoadId).OfType<string>()
            .ToHashSet(StringComparer.Ordinal);
        foreach (var road in mapState.Nodes.Where(node => node.Site?.RoadId is { } id && roadIds.Contains(id)).GroupBy(node => node.Site!.RoadId))
        {
            // Each road is replayed from the state the hunter leaves the tower with: the forks are committed.
            var elites = elitesSoFar;
            var pending = reliquaryPending;
            foreach (var trail in road.OrderBy(node => node.Site!.RoadIndex))
            {
                var bell = IsBellRoad(trail);
                var reliquary = pending && !bell && IsReliquaryEligible(trail);
                if (reliquary) pending = false;
                var elite = !reliquary && !bell && elites < MaxElitesPerMap && RollsElite(map.Seed, map.Depth, trail);
                if (elite) elites++;
                scoutReports[trail.Id] = new(trail.Id, elite);
            }
        }
    }

    /// <summary>A return to a refuge before the watchtower forgets what it showed; the tower can be held again.</summary>
    private void ForgetLostScouting()
    {
        if (!mapState.CompletedNodes.Any(node => node.Watchtower)) scoutReports.Clear();
    }

    private bool IsScoutedElite(WyrmrealmMapNode node) => scoutReports.TryGetValue(node.Id, out var report) && report.Elite;
}
