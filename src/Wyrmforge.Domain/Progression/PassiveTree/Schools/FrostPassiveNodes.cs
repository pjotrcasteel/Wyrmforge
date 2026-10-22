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
        Mastery("deep-freeze", "Deep Freeze", "Every 3rd hit freezes its target for 1.75s.", 265, 385, "frost-mastery"),
        Mastery("ice-armor", "Ice Armor", "Taking damage grants 1.35s of 40% damage reduction.", 265, 515, "frost-mastery"),
        Keystone("absolute-zero", "Absolute Zero", "Frozen enemies take ×2.5 damage.", 190, 335),
        Keystone("winter-shell", "Winter Shell", "Begin warded: when struck, prevent damage for 0.65s; the ward returns 5s after trigger.", 190, 565),
        // Shattering Cold: longer Frost freezes and chills without altering other schools.
        Travel("frost-rime-threads", "Rime Threads", "+3% Frost freeze/chill duration.", 450, 350,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.FrostControlDuration, 0.03))),
        Travel("frost-glasswind", "Glasswind", "+4% Frost freeze/chill duration.", 410, 295,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.FrostControlDuration, 0.04))),
        Travel("frost-cold-snap", "Cold Snap", "+3% Frost freeze/chill duration.", 365, 230,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.FrostControlDuration, 0.03))),
        Notable("frost-arctic-focus", "Arctic Focus", "Frost freeze/chill duration ×1.10.", 310, 165,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.FrostControlDuration, 1.10))),
        Travel("frost-whiteout", "Whiteout", "+4% Frost freeze/chill duration.", 245, 100,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.FrostControlDuration, 0.04))),
        Major("frost-pale-silence", "Pale Silence", "Frost freeze/chill duration ×1.14.", 180, 35,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.FrostControlDuration, 1.14))),

        // Frozen Sanctuary: defensive investment that stays learned when changing schools.
        Travel("frost-snowward", "Snowward", "+3 maximum vitality.", 555, 380,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 3))),
        Travel("frost-iceweave", "Iceweave", "+3 maximum vitality.", 610, 315,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 3))),
        Travel("frost-frozen-blood", "Frozen Blood", "+4 maximum vitality.", 675, 260,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 4))),
        Notable("frost-crystal-bulwark", "Crystal Bulwark", "Damage taken ×0.95.", 745, 190,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.DamageTaken, 0.95))),
        Travel("frost-veil", "Winter Veil", "+5 maximum vitality.", 810, 120,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 5))),
        Major("frost-everwinter", "Everwinter Citadel", "Damage taken ×0.92.", 875, 55,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.DamageTaken, 0.92))),
        Travel("frost-fire-gate", "Steam Ward", "+2 maximum vitality.", 430, 385, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 2))),
        Travel("frost-arcane-gate", "Crystal Ward", "+2 maximum vitality.", 430, 515, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 2))),
    ];

    private static PassiveNodeDefinition Travel(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Travel, PassiveSchool.Frost, 1, x, y, modifiers);

    private static PassiveNodeDefinition Notable(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Notable, PassiveSchool.Frost, 2, x, y, modifiers);

    private static PassiveNodeDefinition Major(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Keystone, PassiveSchool.Frost, 3, x, y, modifiers);

    private static PassiveNodeDefinition Mastery(string id, string name, string description, double x, double y, string group) =>
        new(id, name, description, PassiveNodeKind.Mastery, PassiveSchool.Frost, 2, x, y, PassiveNodeModifiers.None, group);

    private static PassiveNodeDefinition Keystone(string id, string name, string description, double x, double y) =>
        new(id, name, description, PassiveNodeKind.Keystone, PassiveSchool.Frost, 3, x, y, PassiveNodeModifiers.None);
}
