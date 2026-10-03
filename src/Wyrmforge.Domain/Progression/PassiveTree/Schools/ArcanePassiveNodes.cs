namespace Wyrmforge.Domain.Progression.PassiveTree.Schools;

internal static class ArcanePassiveNodes
{
    internal static IReadOnlyList<PassiveNodeDefinition> All { get; } =
    [
        new("arcane-1", "Focus", "+5% projectile speed.", NodeTier.Minor, PassiveSchool.Arcane, 1, [], []),
        new("arcane-2", "Flow", "+5% projectile speed.", NodeTier.Minor, PassiveSchool.Arcane, 1, ["arcane-1"], []),
        new("arcane-major", "Arcane Reservoir", "Projectile speed ×1.3.", NodeTier.Major, PassiveSchool.Arcane, 2, ["arcane-2"], []),
        new("arcane-echo", "Arcane Echo", "Every 6th cast fires a free echo.", NodeTier.Epic, PassiveSchool.Arcane, 3, ["arcane-major"], ["prismatic"]),
        new("prismatic", "Prismatic Volley", "Every 5th cast fires 3 projectiles.", NodeTier.Epic, PassiveSchool.Arcane, 3, ["arcane-major"], ["arcane-echo"]),
        new("echo-chamber", "Echo Chamber", "Echoes deal full damage and may echo again once.", NodeTier.Legendary, PassiveSchool.Arcane, 5, ["arcane-echo"], []),
        new("astral-barrage", "Astral Barrage", "Prismatic Volley fires 5 projectiles.", NodeTier.Legendary, PassiveSchool.Arcane, 5, ["prismatic"], []),
    ];
}
