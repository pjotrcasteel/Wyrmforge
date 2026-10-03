namespace Wyrmforge.Domain.Progression.PassiveTree.Schools;

internal static class FirePassiveNodes
{
    internal static IReadOnlyList<PassiveNodeDefinition> All { get; } =
    [
        new("fire-1", "Ember", "+5% spell damage.", NodeTier.Minor, PassiveSchool.Fire, 1, [], []),
        new("fire-2", "Kindling", "+5% spell damage.", NodeTier.Minor, PassiveSchool.Fire, 1, ["fire-1"], []),
        new("fire-major", "Pyromantic Focus", "Total spell damage ×1.25.", NodeTier.Major, PassiveSchool.Fire, 2, ["fire-2"], []),
        new("wildfire", "Wildfire", "Hits splash 35% damage to nearby enemies.", NodeTier.Epic, PassiveSchool.Fire, 3, ["fire-major"], ["detonation"]),
        new("detonation", "Detonation", "Every 4th hit explodes for ×2 damage.", NodeTier.Epic, PassiveSchool.Fire, 3, ["fire-major"], ["wildfire"]),
        new("inferno", "Dragon's Inferno", "Every 5th cast becomes a ×4 Inferno projectile.", NodeTier.Legendary, PassiveSchool.Fire, 5, ["wildfire"], []),
        new("volcanic", "Volcanic Heart", "Explosions are larger and deal ×2.5 damage.", NodeTier.Legendary, PassiveSchool.Fire, 5, ["detonation"], []),
    ];
}
