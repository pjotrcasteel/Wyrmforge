using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Progression.PassiveTree;

// Learning ownership and effect requirements are deliberately independent. Further
// signature-specific requirement types can be added as those schools are authored.
public sealed record PassiveEffectRequirement(SpellId Signature, FireballMutationId? FireballMutation = null)
{
    public bool AppliesTo(SpellId signature, IReadOnlySet<FireballMutationId> mutations) =>
        signature == Signature && (FireballMutation is null || mutations.Contains(FireballMutation.Value));
}

public static class PassiveNodeEffects
{
    public static BuildModifierSet ResolveConditional(IEnumerable<string> selected, SpellId signature, IReadOnlySet<FireballMutationId> mutations) =>
        BuildModifierSet.Aggregate(selected.Select(PassiveTreeCatalog.Get)
            .Where(node => node.Requirement?.AppliesTo(signature, mutations) == true).Select(node => node.Modifiers));
}
