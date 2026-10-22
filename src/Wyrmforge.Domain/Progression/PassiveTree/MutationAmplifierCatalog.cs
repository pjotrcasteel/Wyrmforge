using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Progression.PassiveTree;

// Shared, capability-based socket definitions. The node grants a socket only;
// it never teaches a mutation or opens another Main Spell slot.
public static class MutationAmplifierCatalog
{
    public static IReadOnlyList<MutationAmplifierDefinition> All { get; } =
    [
        new("fire-spread-crown", MutationEffectCapability.Area, 1.20),
        new("fire-ember-altar", MutationEffectCapability.Duration, 1.25),
    ];

    public static MutationAmplifierSockets CreateSockets() => new(All);

    public static MutationEffectDescriptor? ForFireball(FireballMutationId id) => id switch
    {
        FireballMutationId.Detonation => Describe(id, MutationEffectCapability.Area),
        FireballMutationId.ScorchedEarth => Describe(id, MutationEffectCapability.Duration),
        FireballMutationId.MeteorHeart => Describe(id, MutationEffectCapability.Potency),
        FireballMutationId.CinderNeedle => Describe(id, MutationEffectCapability.Potency),
        _ => null,
    };

    public static IReadOnlyList<MutationEffectDescriptor> EquippedFireball(FireballCoreState core) =>
        core.Equipped.Select(ForFireball).OfType<MutationEffectDescriptor>().ToArray();

    private static MutationEffectDescriptor Describe(FireballMutationId id, params MutationEffectCapability[] capabilities) =>
        new(SpellId.FireBolt.ToString(), id.ToString(), capabilities);
}
