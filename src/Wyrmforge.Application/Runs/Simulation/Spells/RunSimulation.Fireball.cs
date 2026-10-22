using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly IReadOnlySet<string> learnedPassiveNodeIds;
    private BuildModifierSet fireballWebModifiers = BuildModifierSet.Empty;

    private IReadOnlySet<FireballMutationId> preparedFireballMutations = new HashSet<FireballMutationId>();

    public IReadOnlySet<FireballMutationId> PreparedFireballMutations => preparedFireballMutations;

    public void PrepareFireballMutations(IEnumerable<FireballMutationId> mutations)
    {
        ArgumentNullException.ThrowIfNull(mutations);
        if (build.Spells.IsPrimaryCommitted || elapsed > 0) return;
        // One recipe owns one Fireball. This never creates independent automatically firing spells.
        preparedFireballMutations = mutations.Where(id => FireballCoreCatalog.Mutations.Any(known => known.Id == id && known.Playable))
            .Distinct().Take(5).ToHashSet();
        fireballWebModifiers = PassiveNodeEffects.ResolveConditional(learnedPassiveNodeIds, SpellId.FireBolt, preparedFireballMutations);
    }

    private bool HasFireballMutation(FireballMutationId id) =>
        build.Spells.ActiveSpell == Domain.Spells.SpellId.FireBolt && preparedFireballMutations.Contains(id);
}
