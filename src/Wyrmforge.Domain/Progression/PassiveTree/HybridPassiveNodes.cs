using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.PassiveTree;

internal static class HybridPassiveNodes
{
    internal static IReadOnlyList<PassiveNodeDefinition> All { get; } =
    [
        Travel("hybrid-fire-frost-1", "Steam Ward", "+2 maximum vitality and +2% spell damage.", 470, 330,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 2), PassiveNodeModifiers.Percent(BuildStatId.Damage, 0.02))),
        Travel("hybrid-fire-frost-2", "Rimebrand", "+2 maximum vitality and +2% spell damage.", 430, 370,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 2), PassiveNodeModifiers.Percent(BuildStatId.Damage, 0.02))),

        Travel("hybrid-fire-storm-1", "Voltaic Ember", "+2% spell damage and +2% cast speed.", 730, 330,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.Damage, 0.02), PassiveNodeModifiers.Multiply(BuildStatId.CastInterval, 1 / 1.02))),
        Travel("hybrid-fire-storm-2", "Flashfire", "+2% spell damage and +2% cast speed.", 770, 370,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.Damage, 0.02), PassiveNodeModifiers.Multiply(BuildStatId.CastInterval, 1 / 1.02))),

        Travel("hybrid-storm-arcane-1", "Aethercurrent", "+3% projectile speed and +2% cast speed.", 770, 530,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.ProjectileSpeed, 0.03), PassiveNodeModifiers.Multiply(BuildStatId.CastInterval, 1 / 1.02))),
        Travel("hybrid-storm-arcane-2", "Charged Focus", "+3% projectile speed and +2% cast speed.", 730, 570,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.ProjectileSpeed, 0.03), PassiveNodeModifiers.Multiply(BuildStatId.CastInterval, 1 / 1.02))),

        Travel("hybrid-arcane-frost-1", "Crystal Focus", "+2 maximum vitality and +3% projectile speed.", 470, 570,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 2), PassiveNodeModifiers.Percent(BuildStatId.ProjectileSpeed, 0.03))),
        Travel("hybrid-arcane-frost-2", "Glacial Lens", "+2 maximum vitality and +3% projectile speed.", 430, 530,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Flat(BuildStatId.MaxHealth, 2), PassiveNodeModifiers.Percent(BuildStatId.ProjectileSpeed, 0.03))),
    ];

    private static PassiveNodeDefinition Travel(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Travel, null, 1, x, y, modifiers);
}
