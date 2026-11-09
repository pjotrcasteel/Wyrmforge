using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.PassiveTree.Schools;

internal static class FireSynergyNodes
{
    // Authored functional route. Costs and magnitudes are initial tuning.
    internal static IReadOnlyList<PassiveNodeDefinition> All { get; } =
    [
        new("fire-cinder-thread", "Cinder Thread", "+2% burning-ground damage.", PassiveNodeKind.Travel, PassiveSchool.Fire, 1, 0, 0,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.BurnDamage, .02)), Tier: PassiveNodeTier.Minor),
        new("fire-ember-memory", "Ember Memory", "+5% mutation duration.", PassiveNodeKind.Notable, PassiveSchool.Fire, 2, 0, 0,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.MutationDuration, .05)), Tier: PassiveNodeTier.Medium),
        new("fire-crucible", "The Crucible", "+8% mutation area. Enlarges Detonation and Scorched Earth.", PassiveNodeKind.Notable, PassiveSchool.Fire, 3, 0, 0,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.MutationRadius, .08)), Tier: PassiveNodeTier.Major),
        new("fire-ember-covenant", "Ember Covenant", "Fireball kills against burning foes release a small ember explosion. Combines with Cinder Cascade.",
            PassiveNodeKind.Mastery, PassiveSchool.Fire, 3, 0, 0, PassiveNodeModifiers.None, Tier: PassiveNodeTier.Grand),
        new("fire-long-pyre", "The Long Pyre", "+30% mutation duration, but 12% less direct spell damage. Solar Wake fields inherit the duration.",
            PassiveNodeKind.Keystone, PassiveSchool.Fire, 3, 0, 0,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.MutationDuration, .30),
                PassiveNodeModifiers.Multiply(BuildStatId.Damage, .88)), Tier: PassiveNodeTier.Keystone),
    ];
}
