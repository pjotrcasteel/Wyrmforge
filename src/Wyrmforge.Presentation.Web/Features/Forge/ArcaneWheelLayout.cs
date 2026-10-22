using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Presentation.Web.Features.Forge;

// World coordinates are independent of the viewport and of learning ownership.
// Each cluster has room to grow without compressing the whole tree onto a phone.
internal static class ArcaneWheelLayout
{
    internal const double Size = 3200;
    internal const double Center = Size / 2;
    internal readonly record struct Point(double X, double Y);

    private static readonly IReadOnlyDictionary<string, (double Side, double Radius)> Landmarks =
        new Dictionary<string, (double, double)>
        {
            ["wildfire"] = (-150, 910), ["detonation"] = (150, 910),
            ["inferno"] = (-210, 1080), ["volcanic"] = (210, 1080),
            ["deep-freeze"] = (-150, 910), ["ice-armor"] = (150, 910),
            ["absolute-zero"] = (-210, 1080), ["winter-shell"] = (210, 1080),
            ["chainstorm"] = (-150, 910), ["tempest-step"] = (150, 910),
            ["living-storm"] = (-210, 1080), ["lightning-form"] = (210, 1080),
            ["arcane-echo"] = (-150, 910), ["prismatic"] = (150, 910),
            ["echo-chamber"] = (-210, 1080), ["astral-barrage"] = (210, 1080),
            ["fire-needle-practice"] = (-330, 740), ["fire-molten-density"] = (330, 740),
            ["fire-blast-shaping"] = (-390, 940), ["fire-banked-embers"] = (390, 940),
        };

    internal static Point Anchor(PassiveSchool school, PassiveSchool active, double radius = 1320) =>
        Local(school, active, 0, radius);

    internal static Point Position(PassiveNodeDefinition node, PassiveSchool active)
    {
        if (node.Kind == PassiveNodeKind.Origin) return new(Center, Center);
        var owner = ArcaneSchoolCatalog.Owner(node) ?? PassiveSchool.Fire;
        if (Landmarks.TryGetValue(node.Id, out var landmark)) return Local(owner, active, landmark.Side, landmark.Radius);
        if (node.Id.EndsWith("-start", StringComparison.Ordinal)) return Local(owner, active, 0, 300);
        if (node.Id.EndsWith("-major", StringComparison.Ordinal)) return Local(owner, active, 0, 740);
        if (node.Id.StartsWith("hybrid-", StringComparison.Ordinal))
        {
            var side = node.Id.Contains("fire-frost", StringComparison.Ordinal) || node.Id.Contains("arcane-frost", StringComparison.Ordinal) ? -1 : 1;
            var outer = node.Id.EndsWith("-2", StringComparison.Ordinal);
            return outer && side > 0 ? Local(owner, active, 450, 150)
                : Local(owner, active, side * (outer ? 470 : 420), outer ? 360 : 510);
        }
        if (node.Id.EndsWith("-1", StringComparison.Ordinal)) return Local(owner, active, -70, 440);
        if (node.Id.EndsWith("-2", StringComparison.Ordinal)) return Local(owner, active, -70, 580);
        // Existing socket gates sit on the shoulders of each school cluster.
        var source = owner switch
        {
            PassiveSchool.Fire => node.X - 600,
            PassiveSchool.Frost => 450 - node.Y,
            PassiveSchool.Storm => node.Y - 450,
            _ => 600 - node.X,
        };
        return Local(owner, active, source < 0 ? -240 : 240, 520);
    }

    private static Point Local(PassiveSchool school, PassiveSchool active, double side, double radius)
    {
        var angle = ((int)school - (int)active) * Math.PI / 3 - Math.PI / 2;
        return new(Center + Math.Cos(angle) * radius - Math.Sin(angle) * side,
            Center + Math.Sin(angle) * radius + Math.Cos(angle) * side);
    }
}

