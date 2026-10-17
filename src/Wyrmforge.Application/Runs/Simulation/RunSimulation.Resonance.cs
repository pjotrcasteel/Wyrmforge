using Wyrmforge.Application.Runs.RealmInfluence;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly DragonAttractionState dragonAttractionState = new();
    private readonly DragonAttentionState dragonAttentionState = new();
    private readonly DragonSignState dragonSignState = new();
    private readonly RealmInfluenceState realmInfluenceState = new();
    private readonly HashSet<DragonId> defeatedDragonIds = [];
    private RunResonanceState? resonanceState;
    private DragonId? attractedDragon;

    public IReadOnlyList<RunResonanceEntry> Resonance => resonanceState?.Calculate(build, completedRouteNodes) ?? Array.Empty<RunResonanceEntry>();
    public IReadOnlyList<ResonanceThresholdDefinition> ResonanceThresholds => ResonanceThresholdResolver.Resolve(Resonance);
    public IReadOnlyList<DragonAttractionEntry> DragonAttraction => dragonAttractionState.Calculate(Resonance, defeatedDragonIds);
    public IReadOnlyList<DragonSign> DragonSigns => dragonSignState.Calculate(CurrentDragonAttention);
    public IReadOnlyList<RealmInfluenceCue> RealmInfluences => realmInfluenceState.Calculate(CurrentDragonAttention);
    public DragonId? AttractedDragon => attractedDragon;

    private bool CurrentDragonHuntCompleted => dragonEncounterStarted && dragon is null;
    private IReadOnlyList<DragonAttention> CurrentDragonAttention => CurrentDragonHuntCompleted
        ? Array.Empty<DragonAttention>()
        : dragonAttentionState.Calculate(DragonAttraction, mapState.CompletedNodes.Count, attractedDragon);

    internal void InitializeResonance(IReadOnlySet<string> selectedNodes)
    {
        resonanceState = new RunResonanceState(selectedNodes);
        RefreshBuildModifiers(true);
    }

    private void ResolveDragonAttraction()
    {
        if (attractedDragon is not null) return;
        if (AscendantHuntRule.ShouldForce(selectedAscendant, ascendantHuntConsumed, depthState.Depth))
        {
            attractedDragon = selectedAscendant;
            return;
        }
        // First-hunt story qualification (encounter brief §5): the opening chapter always culminates in Ashfang. Later hunts keep
        // the attraction roll's variety. Provisional until the campaign's element order is settled (amendment reconciliation).
        if (firstHunt)
        {
            attractedDragon = DragonId.Ashfang;
            return;
        }
        // A tracked Laboratory lead decides which Wyrm answers, but never overrides an Ascendant rite or the First Hunt.
        if (researchLead is { } lead && !firstHunt && !defeatedDragonIds.Contains(lead))
        {
            attractedDragon = lead;
            return;
        }
        attractedDragon = dragonAttractionState.Roll(Resonance, randomSource, defeatedDragonIds);
    }
}
