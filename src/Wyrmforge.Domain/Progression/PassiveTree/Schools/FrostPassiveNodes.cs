using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.PassiveTree.Schools;

internal static class FrostPassiveNodes
{
    internal static IReadOnlyList<PassiveNodeDefinition> All { get; } =
    [
        Travel("frost-start", "Hoarfrost", "+3 maximum vitality.", 515, 450, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 3))),
        Travel("frost-1", "Rime", "+4 maximum vitality.", 455, 450, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 4))),
        Travel("frost-2", "Permafrost", "+4 maximum vitality.", 395, 450, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 4))),
        Notable("frost-major", "Glacial Core", "Damage taken ×0.90.", 330, 450,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.DamageTaken, 0.90))),
        Mastery("deep-freeze", "Deep Freeze", "Every 4th hit freezes its target briefly.", 265, 385, "frost-mastery"),
        Mastery("ice-armor", "Ice Armor", "Taking damage grants a short barrier.", 265, 515, "frost-mastery"),
        Keystone("absolute-zero", "Absolute Zero", "Frozen enemies take double damage.", 190, 335),
        Keystone("winter-shell", "Winter Shell", "Barrier absorbs one full hit and recharges.", 190, 565),
        Travel("frost-fire-gate", "Steam Ward", "+2 maximum vitality.", 430, 385, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 2))),
        Travel("frost-arcane-gate", "Crystal Ward", "+2 maximum vitality.", 430, 515, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 2))),
    ];

    private static PassiveNodeDefinition Travel(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Travel, PassiveSchool.Frost, 1, x, y, modifiers);

    private static PassiveNodeDefinition Notable(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Notable, PassiveSchool.Frost, 2, x, y, modifiers);

    private static PassiveNodeDefinition Mastery(string id, string name, string description, double x, double y, string group) =>
        new(id, name, description, PassiveNodeKind.Mastery, PassiveSchool.Frost, 2, x, y, PassiveNodeModifiers.None, group);

    private static PassiveNodeDefinition Keystone(string id, string name, string description, double x, double y) =>
        new(id, name, description, PassiveNodeKind.Keystone, PassiveSchool.Frost, 3, x, y, PassiveNodeModifiers.None);
}
