using System.Globalization;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Presentation.Web.Features.Forge;

/// <summary>
/// The town Nexus reflects the mage's actual school and invested Web points.
/// Display only: no independent progression or separate save state.
/// </summary>
internal static class TownNexusRadiance
{
    public static int Points(PassiveSchool school, IReadOnlySet<string> learnedNodes)
    {
        ArgumentNullException.ThrowIfNull(learnedNodes);
        return PassiveTreeCatalog.All
            .Where(node => learnedNodes.Contains(node.Id) && ArcaneSchoolCatalog.Owner(node) == school)
            .Sum(node => node.Cost);
    }

    public static double Strength(int points)
    {
        // Visible when newly unlocked; smooth, diminishing increases as the school matures.
        var progress = Math.Clamp(points, 0, PassiveTreeCatalog.TotalPoints) / (double)PassiveTreeCatalog.TotalPoints;
        return Math.Round(0.16 + 0.70 * Math.Sqrt(progress), 3);
    }

    public static string Style(int points) =>
        "--nexus-radiance-strength:" + Strength(points).ToString("0.000", CultureInfo.InvariantCulture) + ";";
}
