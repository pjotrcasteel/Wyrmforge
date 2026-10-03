namespace Wyrmforge.Domain.Progression.RunUpgrades;

public static class RunUpgradeCatalog
{
    public static IReadOnlyList<RunUpgradeDefinition> All { get; } =
    [
        new(RunUpgradeId.Potency, "Potency", "+18% spell damage.", "✦", 5),
        new(RunUpgradeId.Quickening, "Quickening", "Cast 12% faster.", "⚡", 5),
        new(RunUpgradeId.Vitality, "Vitality", "+18 max health and heal 18.", "♥", 4),
        new(RunUpgradeId.Fleetfoot, "Fleetfoot", "+10% movement speed.", "➶", 3),
        new(RunUpgradeId.Multicast, "Multicast", "+1 projectile per cast, but each projectile deals 10% less damage.", "✧", 2),
        new(RunUpgradeId.FrostTouch, "Frost Touch", "Repeated hits freeze enemies. Higher ranks trigger faster and last longer.", "❄", 3),
        new(RunUpgradeId.ChainSpark, "Chain Spark", "Projectiles gain +1 chain. Stacks with Storm tree effects.", "ϟ", 2),
        new(RunUpgradeId.ArcaneEcho, "Arcane Echo", "Periodically repeat a cast for free. Rank 2 echoes more often and harder.", "◈", 2),
    ];

    public static RunUpgradeDefinition Get(RunUpgradeId id) => All.Single(upgrade => upgrade.Id == id);
}
