using System.Globalization;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Presentation.Web.Features.Forge;

// The embedding follows the real adjacency cycle, not enum order. Node IDs,
// ownership and connections remain domain data; these are presentation routes.
internal static class ArcaneWheelLayout
{
    internal const double Size = 3200;
    internal const double Center = Size / 2;
    internal readonly record struct Point(double X, double Y);
    private static readonly PassiveSchool[] Order =
        [PassiveSchool.Fire, PassiveSchool.Frost, PassiveSchool.Arcane, PassiveSchool.Storm, PassiveSchool.Death, PassiveSchool.Binding];
    private sealed record Bridge(string Prefix, PassiveSchool From, PassiveSchool To, string FromGate, string ToGate, int Direction, bool Outer = false)
    {
        internal string[] Nodes => [FromGate, $"{Prefix}-1", $"{Prefix}-2", ToGate];
    }
    private static readonly Bridge[] Bridges =
    [
        new("hybrid-fire-frost", PassiveSchool.Fire, PassiveSchool.Frost, "fire-frost-gate", "frost-fire-gate", 1),
        new("hybrid-fire-storm", PassiveSchool.Fire, PassiveSchool.Storm, "fire-storm-gate", "storm-fire-gate", -1, true),
        new("hybrid-storm-arcane", PassiveSchool.Storm, PassiveSchool.Arcane, "storm-arcane-gate", "arcane-storm-gate", -1),
        new("hybrid-arcane-frost", PassiveSchool.Arcane, PassiveSchool.Frost, "arcane-frost-gate", "frost-arcane-gate", -1),
    ];
    private static readonly IReadOnlyDictionary<string, (double Side, double Radius)> Landmarks =
        new Dictionary<string, (double, double)>
        {
            ["wildfire"] = (-140, 1020), ["detonation"] = (140, 1020),
            ["inferno"] = (-230, 1190), ["volcanic"] = (230, 1190),
            ["deep-freeze"] = (-140, 1020), ["ice-armor"] = (140, 1020),
            ["absolute-zero"] = (-230, 1190), ["winter-shell"] = (230, 1190),
            ["chainstorm"] = (-140, 1020), ["tempest-step"] = (140, 1020),
            ["living-storm"] = (-230, 1190), ["lightning-form"] = (230, 1190),
            ["arcane-echo"] = (-140, 1020), ["prismatic"] = (140, 1020),
            ["echo-chamber"] = (-230, 1190), ["astral-barrage"] = (230, 1190),
            ["fire-needle-practice"] = (-260, 850), ["fire-molten-density"] = (260, 850),
            ["fire-blast-shaping"] = (-400, 1100), ["fire-banked-embers"] = (400, 1100),
            // Asymmetrical Fire clusters. World-space minimum distance here is >150px.
            ["fire-ember-drift"] = (-250, 380),
            ["fire-scorching-winds"] = (-400, 410),
            ["fire-cinder-halo"] = (-550, 420),
            ["fire-conflagration"] = (-700, 490),
            ["fire-ashfront"] = (-800, 630),
            ["fire-spread-crown"] = (-910, 750),
            ["fire-cinder-temper"] = (240, 475),
            ["fire-burning-veins"] = (460, 730),
            ["fire-searing-focus"] = (650, 840),
            ["fire-immolation"] = (800, 960),
            ["fire-coalbed"] = (920, 1100),
            ["fire-ember-altar"] = (1000, 1250),
            // Frost paths grow from alternative mastery landmarks, then arc into different silhouettes.
            ["frost-rime-threads"] = (-300, 1020),
            ["frost-glasswind"] = (-450, 1040),
            ["frost-cold-snap"] = (-600, 1060),
            ["frost-arctic-focus"] = (-730, 1090),
            ["frost-whiteout"] = (-870, 1130),
            ["frost-pale-silence"] = (-1010, 1170),
            ["frost-snowward"] = (310, 1040),
            ["frost-iceweave"] = (440, 1050),
            ["frost-frozen-blood"] = (560, 1080),
            ["frost-crystal-bulwark"] = (680, 1120),
            ["frost-veil"] = (810, 1135),
            ["frost-everwinter"] = (930, 1160),
        };
    private static double Angle(PassiveSchool school, PassiveSchool active) =>
        (Array.IndexOf(Order, school) - Array.IndexOf(Order, active)) * Math.PI / 3 - Math.PI / 2;
    private static Point Polar(double angle, double radius) => new(Center + Math.Cos(angle) * radius, Center + Math.Sin(angle) * radius);
    private static Point Local(PassiveSchool school, PassiveSchool active, double side, double radius)
    {
        var angle = Angle(school, active);
        return new(Center + Math.Cos(angle) * radius - Math.Sin(angle) * side,
            Center + Math.Sin(angle) * radius + Math.Cos(angle) * side);
    }
    internal static Point Anchor(PassiveSchool school, PassiveSchool active, double radius = 1320) => Local(school, active, 0, radius);
    internal static Point RegionLabel(PassiveSchool school, PassiveSchool active, double side, double radius) => Local(school, active, side, radius);

    internal static Point Position(PassiveNodeDefinition node, PassiveSchool active)
    {
        if (node.Kind == PassiveNodeKind.Origin) return new(Center, Center);
        foreach (var bridge in Bridges)
        {
            if (node.Id == bridge.FromGate) return Local(bridge.From, active, bridge.Direction * 180, 650);
            if (node.Id == bridge.ToGate) return Local(bridge.To, active, -bridge.Direction * 180, 650);
            if (node.Id == $"{bridge.Prefix}-1") return BridgePoint(bridge, active, 1);
            if (node.Id == $"{bridge.Prefix}-2") return BridgePoint(bridge, active, 2);
        }
        var owner = ArcaneSchoolCatalog.Owner(node) ?? PassiveSchool.Fire;
        if (Landmarks.TryGetValue(node.Id, out var landmark)) return Local(owner, active, landmark.Side, landmark.Radius);
        if (node.Id.EndsWith("-start", StringComparison.Ordinal)) return Local(owner, active, 0, 300);
        if (node.Id.EndsWith("-1", StringComparison.Ordinal)) return Local(owner, active, 0, 460);
        if (node.Id.EndsWith("-2", StringComparison.Ordinal)) return Local(owner, active, 0, 620);
        return Local(owner, active, 0, 800);
    }
    private static (double Start, double End, double Radius) Arc(Bridge bridge, PassiveSchool active)
    {
        var offset = bridge.Outer ? Math.PI / 6 : Math.Atan2(180, 650);
        var start = Angle(bridge.From, active) + bridge.Direction * offset;
        var end = Angle(bridge.To, active) - bridge.Direction * offset;
        while ((end - start) * bridge.Direction < 0) end += bridge.Direction * Math.PI * 2;
        return (start, end, bridge.Outer ? 1450 : Math.Sqrt(180 * 180 + 650 * 650));
    }
    private static Point BridgePoint(Bridge bridge, PassiveSchool active, int step)
    {
        var arc = Arc(bridge, active);
        return Polar(arc.Start + (arc.End - arc.Start) * step / 3, arc.Radius);
    }
    internal static string Path(PassiveTreeConnection connection, PassiveSchool active)
    {
        var points = new List<Point>();
        foreach (var bridge in Bridges)
        {
            var index = Array.IndexOf(bridge.Nodes, connection.From);
            if (index < 0 || index >= 3 || bridge.Nodes[index + 1] != connection.To) continue;
            var arc = Arc(bridge, active);
            var start = arc.Start + (arc.End - arc.Start) * index / 3;
            var end = arc.Start + (arc.End - arc.Start) * (index + 1) / 3;
            if (bridge.Outer && index == 0)
            {
                points.Add(Position(PassiveTreeCatalog.Get(connection.From), active));
                points.Add(Polar(start, 1000));
            }
            var steps = Math.Max(1, (int)Math.Ceiling(Math.Abs(end - start) / (Math.PI / 45)));
            for (var i = 0; i <= steps; i++) points.Add(Polar(start + (end - start) * i / steps, arc.Radius));
            if (bridge.Outer && index == 2)
            {
                points.Add(Polar(end, 1000));
                points.Add(Position(PassiveTreeCatalog.Get(connection.To), active));
            }
            return Polyline(points);
        }
        return Polyline([Position(PassiveTreeCatalog.Get(connection.From), active), Position(PassiveTreeCatalog.Get(connection.To), active)]);
    }
    private static string Polyline(IEnumerable<Point> points) => string.Join(" ", points.Select((point, index) =>
        string.Create(CultureInfo.InvariantCulture, $"{(index == 0 ? "M" : "L")} {point.X:0.##} {point.Y:0.##}")));
}
