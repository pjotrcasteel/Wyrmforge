using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.PassiveTree.Schools;

internal static class ArcanePassiveNodes
{
    internal static IReadOnlyList<PassiveNodeDefinition> All { get; } =
    [
        Travel("arcane-start", "Focus", "+4% projectile speed.", 600, 535,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.ProjectileSpeed, 0.04))),
        Travel("arcane-1", "Flow", "+5% projectile speed.", 600, 595,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.ProjectileSpeed, 0.05))),
        Travel("arcane-2", "Aether", "+5% projectile speed.", 600, 655,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.ProjectileSpeed, 0.05))),
        Notable("arcane-major", "Arcane Reservoir", "Projectile speed ×1.20.", 600, 720,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.ProjectileSpeed, 1.20))),
        Mastery("arcane-echo", "Arcane Echo", "Every 6th cast fires a free echo at 60% damage.", 535, 785, "arcane-mastery"),
        Mastery("prismatic", "Prismatic Volley", "Every 5th cast fires 3 projectiles.", 665, 785, "arcane-mastery"),
        Keystone("echo-chamber", "Echo Chamber", "Arcane Echo fires twice and both echoes deal full damage.", 485, 852),
        Keystone("astral-barrage", "Astral Barrage", "Prismatic Volley fires 5 projectiles.", 715, 852),
        Travel("arcane-frost-gate", "Glacial Lens", "+3% projectile speed.", 530, 620,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.ProjectileSpeed, 0.03))),
        Travel("arcane-storm-gate", "Charged Focus", "+3% projectile speed.", 670, 620,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.ProjectileSpeed, 0.03))),
    ];

    private static PassiveNodeDefinition Travel(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Travel, PassiveSchool.Arcane, 1, x, y, modifiers);

    private static PassiveNodeDefinition Notable(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Notable, PassiveSchool.Arcane, 2, x, y, modifiers);

    private static PassiveNodeDefinition Mastery(string id, string name, string description, double x, double y, string group) =>
        new(id, name, description, PassiveNodeKind.Mastery, PassiveSchool.Arcane, 2, x, y, PassiveNodeModifiers.None, group);

    private static PassiveNodeDefinition Keystone(string id, string name, string description, double x, double y) =>
        new(id, name, description, PassiveNodeKind.Keystone, PassiveSchool.Arcane, 3, x, y, PassiveNodeModifiers.None);
}
