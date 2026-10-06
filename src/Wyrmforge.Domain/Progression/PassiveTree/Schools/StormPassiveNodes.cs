using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.PassiveTree.Schools;

internal static class StormPassiveNodes
{
    internal static IReadOnlyList<PassiveNodeDefinition> All { get; } =
    [
        Travel("storm-start", "Static", "+3% cast speed.", 685, 450,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.CastInterval, 1 / 1.03))),
        Travel("storm-1", "Surge", "+4% cast speed.", 745, 450,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.CastInterval, 1 / 1.04))),
        Travel("storm-2", "Overcharge", "+4% cast speed.", 805, 450,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.CastInterval, 1 / 1.04))),
        Notable("storm-major", "Stormheart", "Cast interval ×0.85.", 870, 450,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.CastInterval, 0.85))),
        Mastery("chainstorm", "Chainstorm", "Projectiles chain once after a kill.", 935, 385, "storm-mastery"),
        Mastery("tempest-step", "Tempest Step", "Moving builds speed up to +25%.", 935, 515, "storm-mastery"),
        Keystone("living-storm", "Living Storm", "Chains may continue through up to 4 enemies.", 1010, 335),
        Keystone("lightning-form", "Lightning Form", "At full movement momentum, casts ×1.5 faster.", 1010, 565),
        Travel("storm-fire-gate", "Flashfire", "+2% cast speed.", 770, 385,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.CastInterval, 1 / 1.02))),
        Travel("storm-arcane-gate", "Aethercurrent", "+2% cast speed.", 770, 515,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.CastInterval, 1 / 1.02))),
    ];

    private static PassiveNodeDefinition Travel(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Travel, PassiveSchool.Storm, 1, x, y, modifiers);

    private static PassiveNodeDefinition Notable(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Notable, PassiveSchool.Storm, 2, x, y, modifiers);

    private static PassiveNodeDefinition Mastery(string id, string name, string description, double x, double y, string group) =>
        new(id, name, description, PassiveNodeKind.Mastery, PassiveSchool.Storm, 2, x, y, PassiveNodeModifiers.None, group);

    private static PassiveNodeDefinition Keystone(string id, string name, string description, double x, double y) =>
        new(id, name, description, PassiveNodeKind.Keystone, PassiveSchool.Storm, 3, x, y, PassiveNodeModifiers.None);
}
