using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Presentation.Web.Features.Forge;

// Layout is presentation-only. Rotation never changes node identity, adjacency,
// ownership, learned state or effect calculation.
internal static class ArcaneWheelLayout
{
    internal const double Center = 600;
    internal readonly record struct Point(double X, double Y);

    internal static Point Anchor(PassiveSchool school, PassiveSchool active, double radius = 470) =>
        Polar(((int)school - (int)active) * Math.PI / 3 - Math.PI / 2, radius);

    internal static Point Position(PassiveNodeDefinition node, PassiveSchool active)
    {
        if (node.Kind == PassiveNodeKind.Origin) return new(Center, Center);
        var school = ArcaneSchoolCatalog.Owner(node) ?? PassiveSchool.Fire;
        var x = node.X - 600;
        var y = node.Y - 450;
        var sourceAngle = school switch
        {
            PassiveSchool.Fire => -Math.PI / 2,
            PassiveSchool.Frost => Math.PI,
            PassiveSchool.Storm => 0,
            _ => Math.PI / 2,
        };
        var offset = Math.Atan2(Math.Sin(Math.Atan2(y, x) - sourceAngle), Math.Cos(Math.Atan2(y, x) - sourceAngle));
        var angle = ((int)school - (int)active) * Math.PI / 3 - Math.PI / 2 + offset * .60;
        return Polar(angle, 90 + Math.Sqrt(x * x + y * y) * .73);
    }

    private static Point Polar(double angle, double radius) => new(Center + Math.Cos(angle) * radius, Center + Math.Sin(angle) * radius);
}
