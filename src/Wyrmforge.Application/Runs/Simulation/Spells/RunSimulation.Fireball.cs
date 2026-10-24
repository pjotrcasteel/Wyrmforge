using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly IReadOnlySet<string> learnedPassiveNodeIds;
    private readonly MutationAmplifierSockets mutationAmplifiers = MutationAmplifierCatalog.CreateSockets();
    private readonly Dictionary<(FireballMutationId Mutation, MutationEffectCapability Capability), double> fireballAmplification = [];

    private int preparedFireballLevel = 1;
    private IReadOnlySet<FireballMutationId> preparedFireballMutations = new HashSet<FireballMutationId>();
    // This immutable representation changes only during pre-Hunt preparation.
    // Creating 60 render snapshots per second must not allocate a new recipe.
    private FireballMutationSet preparedFireballSet;
    private FireballVisualRecipe preparedFireballVisual = FireballVisualRecipe.Resolve(1, []);

    public int PreparedFireballLevel => preparedFireballLevel;
    public double PreparedFireballDamageMultiplier => FireballCoreCatalog.DamageMultiplier(preparedFireballLevel);
    public IReadOnlySet<FireballMutationId> PreparedFireballMutations => preparedFireballMutations;
    public IReadOnlyList<MutationAmplifierAssignment> PreparedMutationAmplifiers => mutationAmplifiers.ToSave();

    public void PrepareFireballCoreLevel(int level)
    {
        if (build.Spells.IsPrimaryCommitted || elapsed > 0) return;
        preparedFireballLevel = Math.Clamp(level, 1, 5);
        RebuildPreparedFireballVisual();
    }

    public void PrepareFireballMutations(IEnumerable<FireballMutationId> mutations)
    {
        ArgumentNullException.ThrowIfNull(mutations);
        if (build.Spells.IsPrimaryCommitted || elapsed > 0) return;
        // One recipe owns one Fireball. This never creates independent automatically firing spells.
        preparedFireballMutations = mutations.Where(id => FireballCoreCatalog.Mutations.Any(known => known.Id == id && known.Playable))
            .Distinct().Take(5).ToHashSet();
        RebuildPreparedFireballVisual();
        RebuildFireballAmplification();
    }

    public void PrepareMutationAmplifiers(IEnumerable<MutationAmplifierAssignment> assignments)
    {
        ArgumentNullException.ThrowIfNull(assignments);
        if (build.Spells.IsPrimaryCommitted || elapsed > 0) return;
        mutationAmplifiers.Restore(assignments);
        RebuildFireballAmplification();
    }

    private void RebuildPreparedFireballVisual()
    {
        preparedFireballSet = FireballMutationSet.Resolve(preparedFireballMutations);
        preparedFireballVisual = new FireballVisualRecipe(
            FireballVisualRecipe.CurrentVersion, preparedFireballLevel, preparedFireballSet.Mask);
    }

    private void RebuildFireballAmplification()
    {
        fireballAmplification.Clear();
        var equipped = preparedFireballMutations.Select(MutationAmplifierCatalog.ForFireball).OfType<MutationEffectDescriptor>().ToArray();
        foreach (var id in preparedFireballMutations)
        {
            if (MutationAmplifierCatalog.ForFireball(id) is not { } descriptor) continue;
            foreach (var capability in descriptor.Capabilities)
            {
                var factor = mutationAmplifiers.FactorFor(descriptor, capability, learnedPassiveNodeIds, equipped);
                if (factor > 1) fireballAmplification[(id, capability)] = factor;
            }
        }
    }

    private double FireballEffectFactor(FireballMutationId mutation, MutationEffectCapability capability) =>
        fireballAmplification.GetValueOrDefault((mutation, capability), 1);

    private bool HasFireballMutation(FireballMutationId id) =>
        build.Spells.ActiveSpell == Domain.Spells.SpellId.FireBolt && preparedFireballSet.Has(id);
}
