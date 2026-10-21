using Wyrmforge.Application.World;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.World;

namespace Wyrmforge.Application.Runs.Hunts;

/// <summary>
/// Each lineage keeps its own ladder: clearing Fire never opens Frost tiers. A tier opens once the previous tier of the
/// same lineage is cleared, and only authored tiers can be entered.
/// </summary>
public static class HuntLadder
{
    public static int Number(WyrmTier tier) => (int)tier + 1;

    public static bool IsAuthored(RegionId region, WyrmTier tier) =>
        region == RegionCatalog.CinderFrontierId && tier is WyrmTier.Wyrm or WyrmTier.Ascendant or WyrmTier.Elder;

    public static bool IsUnlocked(RegionId region, WyrmTier tier, int highestClearedTier) =>
        IsAuthored(region, tier) && Number(tier) <= highestClearedTier + 1;

    /// <summary>Fights on the shortest and longest road, before any optional side quest. Lengths grow roughly 1.7x per tier.</summary>
    public static (int Minimum, int Maximum) TrailFights(WyrmTier tier) => tier switch
    {
        WyrmTier.Wyrm => (3, 4),
        WyrmTier.Ascendant => (6, 8),
        WyrmTier.Elder => (10, 13),
        _ => throw new ArgumentOutOfRangeException(nameof(tier), tier, "Only Tier I–III routes are authored."),
    };
}
