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
        Travel("fire-needle-practice", "Kindled Reach", "+3% Fire mutation area.", 545, 210,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.MutationRadius, 0.03))),
        Travel("fire-molten-density", "Hot Coals", "+3% burning-ground damage.", 655, 210,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.BurnDamage, 0.03))),
        Travel("fire-blast-shaping", "Shock Front", "+4% Fire mutation area.", 515, 165,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.MutationRadius, 0.04))),
        Travel("fire-banked-embers", "Banked Embers", "+4% Fire mutation duration.", 685, 165,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.MutationDuration, 0.04))),
        // Conflagration: a long, winding area-control route rather than a mirrored spoke.
        Travel("fire-ember-drift", "Ember Drift", "+3% mutation area.", 545, 375,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.MutationRadius, 0.03))),
        Travel("fire-scorching-winds", "Scorching Winds", "+4% mutation area.", 510, 320,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.MutationRadius, 0.04))),
        Travel("fire-cinder-halo", "Cinder Halo", "+3% spell damage.", 480, 265,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.Damage, 0.03))),
        Notable("fire-conflagration", "Conflagration", "Mutation area ×1.12 and duration ×1.06.", 468, 200,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.MutationRadius, 1.12),
                PassiveNodeModifiers.Multiply(BuildStatId.MutationDuration, 1.06))),
        Travel("fire-ashfront", "Ashfront", "+4% mutation duration.", 455, 133,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.MutationDuration, 0.04))),
        Major("fire-spread-crown", "Crown of Ash", "Mutation area ×1.15 and duration ×1.10.", 440, 65,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.MutationRadius, 1.15),
                PassiveNodeModifiers.Multiply(BuildStatId.MutationDuration, 1.10))),

        // Immolation: damage-over-time and sustained-pressure specialization.
        Travel("fire-cinder-temper", "Cinder Temper", "+3% burning-ground damage.", 660, 370,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.BurnDamage, 0.03))),
        Travel("fire-burning-veins", "Burning Veins", "+4% burning-ground damage.", 708, 330,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.BurnDamage, 0.04))),
        Travel("fire-searing-focus", "Searing Focus", "+3% burning-ground damage.", 740, 265,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.BurnDamage, 0.03))),
        Notable("fire-immolation", "Immolation", "Mutation duration ×1.12.", 754, 190,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.MutationDuration, 1.12))),
        Travel("fire-coalbed", "Coalbed", "+4% burning-ground damage.", 787, 130,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.BurnDamage, 0.04))),
        Major("fire-ember-altar", "Heart of the Furnace", "Spell damage ×1.12 and mutation duration ×1.08.", 805, 55,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Multiply(BuildStatId.Damage, 1.12),
                PassiveNodeModifiers.Multiply(BuildStatId.MutationDuration, 1.08))),
        Travel("fire-frost-gate", "Searing Rime", "+2% spell damage.", 530, 280, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.Damage, 0.02))),
        Travel("fire-storm-gate", "Voltaic Coal", "+2% spell damage.", 670, 280, PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.Damage, 0.02))),
    ];

    private static PassiveNodeDefinition Travel(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Travel, PassiveSchool.Fire, 1, x, y, modifiers);

    private static PassiveNodeDefinition Notable(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Notable, PassiveSchool.Fire, 2, x, y, modifiers);

    private static PassiveNodeDefinition Major(string id, string name, string description, double x, double y, BuildModifierProfile modifiers) =>
        new(id, name, description, PassiveNodeKind.Keystone, PassiveSchool.Fire, 3, x, y, modifiers);

    private static PassiveNodeDefinition Mastery(string id, string name, string description, double x, double y, string group) =>
        new(id, name, description, PassiveNodeKind.Mastery, PassiveSchool.Fire, 2, x, y, PassiveNodeModifiers.None, group);

    private static PassiveNodeDefinition Keystone(string id, string name, string description, double x, double y) =>
        new(id, name, description, PassiveNodeKind.Keystone, PassiveSchool.Fire, 3, x, y, PassiveNodeModifiers.None);
}
