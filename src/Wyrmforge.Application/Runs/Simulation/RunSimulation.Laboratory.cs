using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Interactions;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Composition;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private LaboratoryMutationId? preparedLaboratoryMutation;
    private LaboratoryMutationId? activeLaboratoryMutation;
    private DragonId? researchLead;
    private int reactionsTriggered;
    private readonly ReactionBudget reactionBudget = new(BlueprintRuleset.Current.MaxReactionEventsPerStep);

    public LaboratoryMutationId? PreparedLaboratoryMutation => preparedLaboratoryMutation;
    public LaboratoryMutationId? ActiveLaboratoryMutation => activeLaboratoryMutation;
    public DragonId? ResearchLead => researchLead;
    public int ReactionsTriggered => reactionsTriggered;
    public int PeakReactionEventsPerStep => reactionBudget.PeakPerStep;
    public int ReactionEventsSuppressed => reactionBudget.Suppressed;

    internal void EnableResearchLead(DragonId? wyrm) => researchLead = wyrm;

    // The mutation is carried into the hunt but only wakes when its foundation spell becomes the primary.
    public void PrepareLaboratoryMutation(LaboratoryMutationId? mutation)
    {
        if (build.Spells.IsPrimaryCommitted || elapsed > 0) return;
        preparedLaboratoryMutation = mutation;
    }

    private void ApplyPreparedLaboratoryMutation()
    {
        if (preparedLaboratoryMutation is not { } id || activeLaboratoryMutation is not null) return;
        var mutation = LaboratoryCatalog.Get(id);
        if (build.Spells.ActiveSpell != mutation.Foundation) return;
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
