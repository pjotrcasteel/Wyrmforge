using System.Globalization;
using System.Security;
using System.Text;
using System.Text.Json;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Spells;

CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
var seed = args.Length > 0 ? int.Parse(args[0], CultureInfo.InvariantCulture) : 42;
var output = args.Length > 1 ? args[1] : "docs/playtesting/hunt-length";
Directory.CreateDirectory(output);
var results = new List<object>();
var markdown = new StringBuilder($"# Generated Hunt length evidence\n\nReproduce: `dotnet run --project tools/hunt-report -- {seed} {output}`. Generator version {WyrmrealmHuntLengthCatalog.GeneratorVersion}.\n\nEvery count below comes from the actual C# generator. Combat counts exclude the Wyrm. Shortest/longest count encounters on a legal connected path; total generated nodes are not a played route.\n\n| Region | Depth | Combat nodes | Shortest | Longest | Optional fights | Decisions | Paths | Map |\n|---|---:|---:|---:|---:|---:|---:|---:|---|\n");
foreach (var school in new[] { SpellSchool.Fire, SpellSchool.Frost })
foreach (var profile in WyrmrealmHuntLengthCatalog.All)
{
    var nodes = WyrmrealmMapGenerator.Generate(profile.Depth, seed, school);
    var totals = new Dictionary<string, (int Min, int Max, long Paths)>();
    foreach (var node in nodes.OrderByDescending(n => n.Site!.Point.Y))
    {
        var cost = node.Type == WyrmrealmNodeType.Combat ? 1 : 0;
        var incoming = node.PreviousNodeIds.Select(id => totals[id]).ToArray();
        totals[node.Id] = incoming.Length == 0 ? (cost, cost, 1)
            : (cost + incoming.Min(p => p.Min), cost + incoming.Max(p => p.Max), incoming.Sum(p => p.Paths));
    }
    var end = totals[nodes.Single(n => n.Type == WyrmrealmNodeType.Dragon).Id];
    var combat = nodes.Count(n => n.Type == WyrmrealmNodeType.Combat);
    var decisions = nodes.Count(n => nodes.Count(next => next.PreviousNodeIds.Contains(n.Id)) > 1);
    var file = $"{school.ToString().ToLowerInvariant()}-depth-{profile.Depth}-seed-{seed}";
    var metrics = new { region = school.ToString(), profile.Depth, seed, combatNodes = combat,
        shortestPathCombatEncounters = end.Min, longestPathCombatEncounters = end.Max,
        optionalCombatEncounters = end.Max - end.Min, decisionPoints = decisions, legalPaths = end.Paths };
    results.Add(metrics);
    var graph = new { schemaVersion = 2, generatorVersion = WyrmrealmHuntLengthCatalog.GeneratorVersion, metrics,
        pacing = profile, territory = nodes[0].Territory,
        nodes = nodes.Select(n => new { n.Id, n.Stage, n.Lane, n.Name, n.Type, n.Habitat, n.PreLair, n.PreviousNodeIds,
            n.Site, n.Route, n.Rarity, n.AttunementSchool, n.EncounterKind, territory = new Dictionary<string, string> { ["$ref"] = "#/territory" } }) };
    File.WriteAllText(Path.Combine(output, file + ".json"), JsonSerializer.Serialize(graph, new JsonSerializerOptions { WriteIndented = true }));
    WriteSvg(Path.Combine(output, file + ".svg"), nodes, $"{school} · depth {profile.Depth} · seed {seed} · {end.Min}–{end.Max} fights before Wyrm");
    markdown.AppendLine($"| {school} | {profile.Depth} | {combat} | {end.Min} | {end.Max} | {end.Max - end.Min} | {decisions} | {end.Paths} | [SVG]({file}.svg) · [raw graph]({file}.json) |");
}
File.WriteAllText(Path.Combine(output, "metrics.json"), JsonSerializer.Serialize(results, new JsonSerializerOptions { WriteIndented = true }));
markdown.AppendLine("\nThe supported depths are the current pacing input. The current game resolves Wyrm identity/rarity at the lair; this change does not invent a preselected rarity contract. A future Hunt request can map an explicit threat tier to these budgets. Depth 1 retains two opening encounters, village and final approach, so its shortest route has six fights; the master design's 3–4 example is explicitly illustrative.\n\nEach sector guarantees a short road plus a longer alternative, with distinct elemental attunements. Long roads place a real relic reward halfway along them. Cross trails advance exactly one stop, go uphill, and cannot enter a rewarded road beyond its relic. Stage numbers still represent authored pressure (1–8), rather than encounter ordinal. More encounters do not repeat Rank II/III rewards: trail rewards use the existing minor refinement envelope, each stat capped at rank 6; XP-based milestones remain levels 5/10/15. Existing recovery, hazards and boss behavior remain active.\n\n## Timing limits\n\nNo human completion-time measurement is claimed. Ordinary encounter phase clocks impose the following theoretical floor, excluding enemy clear time, traversal, menus, Wyrm combat and the special Bell Warden final approach. These values are derived by starting the real EncounterDirector and adding four combat phases, its breathing room and the 2-second entry grace. They are not expected run durations.\n\n| Pressure stage | Ordinary encounter clock floor |\n|---:|---:|");
foreach (var stage in new[] { 1, 3, 5, 8 })
{
    var director = new EncounterDirector();
    director.Start(EnemyEncounterPattern.Mixed, 1, stage);
    markdown.AppendLine($"| {stage} | {director.PhaseDuration * 4 + EncounterDirector.BreathingRoomSeconds + 2:0.#} seconds |");
}
markdown.AppendLine("\nValidation covers 800 maps (100 seeds × four depths × Fire/Frost), deterministic full serialized geometry/content, reachability/no dead ends, forward edges, shortest/longest budgets, distinct-school forks, mobile target spacing, protected detour rewards and bounded trail refinements. Existing dry-ground/scenery tests also run. SVGs use actual generated coordinates and sampled trail curves; they are diagnostic maps, not game screenshots.\n\nThis increases route length and the number of decisions without adding health multipliers. Survival and XP balance across the longer advanced routes still require human playtesting; generator validity is not proof of enjoyable completion time.");
File.WriteAllText(Path.Combine(output, "README.md"), markdown.ToString());
Console.WriteLine(markdown.ToString());

static void WriteSvg(string path, IReadOnlyList<WyrmrealmMapNode> nodes, string title)
{
    var svg = new StringBuilder($"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 660 860\"><rect width=\"660\" height=\"860\" fill=\"#151719\"/><style>text{{font-family:system-ui,sans-serif;fill:#ded9ce}} .road{{fill:none;stroke:#867151;stroke-width:2;opacity:.8}} .cross{{fill:none;stroke:#aa9268;stroke-width:1.3;stroke-dasharray:4 3}}</style><text x=\"24\" y=\"28\" font-size=\"15\">{SecurityElement.Escape(title)}</text>");
    double X(HuntPoint p) => 20 + p.X * 6.2;
    double Y(HuntPoint p) => 45 + p.Y * 7.6;
    void Trail(HuntPoint a, HuntPoint b, string style)
    {
        var points = Enumerable.Range(0, 41).Select(i => WyrmrealmMapGenerator.TrailPoint(a, b, i / 40d));
        svg.Append($"<polyline class=\"{style}\" points=\"{string.Join(' ', points.Select(p => $"{X(p):0.##},{Y(p):0.##}"))}\"/>");
    }
    var territory = nodes[0].Territory!;
    svg.Append($"<polyline fill=\"none\" stroke=\"#405b68\" stroke-width=\"12\" points=\"{string.Join(' ', territory.River.Select(p => $"{X(p):0.##},{Y(p):0.##}"))}\"/>");
    foreach (var node in nodes)
    {
        foreach (var edge in node.Site!.IncomingTrail.Zip(node.Site.IncomingTrail.Skip(1))) Trail(edge.First, edge.Second, "road");
        foreach (var previous in node.PreviousNodeIds.Select(id => nodes.Single(n => n.Id == id)))
            Trail(previous.Site!.Point, node.Site.Point, previous.Site.RoadId == node.Site.RoadId ? "road" : "cross");
    }
    var index = 0;
    foreach (var node in nodes)
    {
        index++;
        var p = node.Site!.Point;
        var label = node.Type == WyrmrealmNodeType.Dragon ? "W" : index.ToString(CultureInfo.InvariantCulture);
        var fill = node.Type == WyrmrealmNodeType.Dragon ? "#a64d46" : node.Site.BonusRelic ? "#a68536" : "#3c5551";
        svg.Append($"<g><title>{SecurityElement.Escape($"{node.Id}: {node.Name}; pressure {node.Stage}; {node.Habitat}")}</title><circle cx=\"{X(p):0.##}\" cy=\"{Y(p):0.##}\" r=\"10\" fill=\"{fill}\" stroke=\"#c9b78c\"/><text x=\"{X(p):0.##}\" y=\"{Y(p) + 3.5:0.##}\" text-anchor=\"middle\" font-size=\"10\">{label}</text></g>");
    }
    svg.Append("<text x=\"24\" y=\"835\" font-size=\"12\">Gold = detour relic · W = Wyrm · numbered nodes are identifiers, not pressure</text></svg>");
    File.WriteAllText(path, svg.ToString());
}
