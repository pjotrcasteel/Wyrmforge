using Wyrmforge.Application.World;
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

    /// <summary>The region this hunt takes place in (amendment §6). Defaults to the starting region.</summary>
    public RegionDefinition Region { get; private set; } = RegionCatalog.Starting;

    internal void EnterRegion(RegionDefinition region)
    {
        ArgumentNullException.ThrowIfNull(region);
        if (region.Status != RegionStatus.Playable) throw new InvalidOperationException($"Region '{region.Id}' has no hunt content yet.");
        var redraw = region.DominantSchool != Region.DominantSchool;
        Region = region;
        // Same seed, same layout: only the habitats change. The generator owns its own stream, so no combat randomness shifts.
        if (redraw) mapState = CreateSeededMapState(depthState.Depth);
    }

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
        // First-hunt story qualification (encounter brief §5): a region's opening hunt culminates in its home lineage (Ashfang for
        // the starting region). Later hunts keep the attraction roll's variety, limited to lineages that hunt in the region.
        if (firstHunt || regionOpening)
        {
            attractedDragon = Region.HomeLineage;
            return;
        }
        // A tracked Laboratory lead decides which Wyrm answers, but never overrides an Ascendant rite or the First Hunt.
        var absent = Region.AbsentLineages;
        if (researchLead is { } lead && !firstHunt && !defeatedDragonIds.Contains(lead) && !absent.Contains(lead))
        {
            attractedDragon = lead;
            return;
        }
        attractedDragon = dragonAttractionState.Roll(Resonance, randomSource, absent.Count == 0 ? defeatedDragonIds : [.. defeatedDragonIds, .. absent]);
    }
}
