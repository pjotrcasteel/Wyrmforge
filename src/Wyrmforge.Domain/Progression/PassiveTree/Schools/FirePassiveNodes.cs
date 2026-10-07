using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.PassiveTree.Schools;

internal static class FirePassiveNodes
{
    internal static IReadOnlyList<PassiveNodeDefinition> All { get; } =
    [
        Travel("fire-start", "Spark", "+3% spell damage.", 600, 365, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.Damage, 0.03))),
        Travel("fire-1", "Ember", "+4% spell damage.", 600, 305, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.Damage, 0.04))),
        Travel("fire-2", "Kindling", "+4% spell damage.", 600, 245, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.Damage, 0.04))),
        Notable("fire-major", "Pyromantic Focus", "Total spell damage ×1.15.", 600, 180,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.Damage, 1.15))),
        Mastery("wildfire", "Wildfire", "Hits splash 35% damage to nearby enemies.", 535, 115, "fire-mastery"),
        Mastery("detonation", "Detonation", "Every 4th hit explodes for ×2 damage in a small area.", 665, 115, "fire-mastery"),
        Keystone("inferno", "Dragon's Inferno", "Every 5th cast becomes a ×4 Inferno projectile.", 485, 48),
        Keystone("volcanic", "Volcanic Heart", "Detonation explosions are larger and deal ×2.5 damage.", 715, 48),
        Travel("fire-frost-gate", "Searing Rime", "+2% spell damage.", 530, 280, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.Damage, 0.02))),
        Travel("fire-storm-gate", "Voltaic Coal", "+2% spell damage.", 670, 280, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.Damage, 0.02))),
    ];

    private static PassiveNodeDefinition Travel(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Travel, PassiveSchool.Fire, 1, x, y, modifiers);

    private static PassiveNodeDefinition Notable(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Notable, PassiveSchool.Fire, 2, x, y, modifiers);

    private static PassiveNodeDefinition Mastery(string id, string name, string description, double x, double y, string group) =>
        new(id, name, description, PassiveNodeKind.Mastery, PassiveSchool.Fire, 2, x, y, PassiveNodeModifiers.None, group);

    private static PassiveNodeDefinition Keystone(string id, string name, string description, double x, double y) =>
        new(id, name, description, PassiveNodeKind.Keystone, PassiveSchool.Fire, 3, x, y, PassiveNodeModifiers.None);
}
