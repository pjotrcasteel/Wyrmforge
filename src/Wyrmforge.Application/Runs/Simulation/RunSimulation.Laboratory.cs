using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Interactions;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Composition;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private IReadOnlyList<LaboratoryMutationId> preparedLaboratoryMutations = [];
    private LaboratoryMutationId? activeLaboratoryMutation;
    private DragonId? researchLead;
    private int reactionsTriggered;
    private readonly ReactionBudget reactionBudget = new(BlueprintRuleset.Current.MaxReactionEventsPerStep);

    public IReadOnlyList<LaboratoryMutationId> PreparedLaboratoryMutations => preparedLaboratoryMutations;
    public LaboratoryMutationId? ActiveLaboratoryMutation => activeLaboratoryMutation;
    public DragonId? ResearchLead => researchLead;
    public int ReactionsTriggered => reactionsTriggered;
    public int PeakReactionEventsPerStep => reactionBudget.PeakPerStep;
    public int ReactionEventsSuppressed => reactionBudget.Suppressed;

    internal void EnableResearchLead(DragonId? wyrm) => researchLead = wyrm;

    public void PrepareLaboratoryMutation(LaboratoryMutationId? mutation) =>
        PrepareLaboratoryMutations(mutation is { } id ? [id] : []);

    // Socketed mutations are carried into the hunt; only the one whose foundation becomes the primary wakes.
    // The socket limit and one-per-foundation rule are re-applied here so a tampered caller cannot exceed them.
    public void PrepareLaboratoryMutations(IEnumerable<LaboratoryMutationId> mutations)
    {
        ArgumentNullException.ThrowIfNull(mutations);
        if (build.Spells.IsPrimaryCommitted || elapsed > 0) return;
        preparedLaboratoryMutations = mutations
            .Distinct()
            .DistinctBy(id => LaboratoryCatalog.Get(id).Foundation)
            .Take(LaboratoryCatalog.MaxEquippedMutations)
            .ToArray();
    }

    private void ApplyPreparedLaboratoryMutation()
    {
        if (activeLaboratoryMutation is not null) return;
        var match = preparedLaboratoryMutations.Where(id => LaboratoryCatalog.Get(id).Foundation == build.Spells.ActiveSpell).Select(id => (LaboratoryMutationId?)id).FirstOrDefault();
        if (match is not { } id) return;
        var mutation = LaboratoryCatalog.Get(id);
        // Reuses the existing synergy, so a later level-up can never stack the legacy effect on top.
        if (!build.Synergies.Contains(mutation.Realizes))
        {
            foreach (var spell in Domain.Spells.Synergies.SynergyCatalog.Get(mutation.Realizes).RequiredSpells)
                if (build.Spells[spell] == 0) build.Spells.LearnOrUpgrade(spell);
            build.Synergies.Select(mutation.Realizes, build.Spells);
        }
        activeLaboratoryMutation = id;
    }

    private IEnumerable<BuildModifierProfile> ActiveLaboratoryModifierProfiles() =>
        activeLaboratoryMutation is { } id ? [LaboratoryCatalog.Get(id).Modifiers] : [];

    private void RecordReaction() => reactionsTriggered++;

    // Secondary events spawned by reactions share one per-step budget (BlueprintRuleset), so chains stay bounded.
    private bool TrySpendReactionEvent() => reactionBudget.TrySpend();
}
