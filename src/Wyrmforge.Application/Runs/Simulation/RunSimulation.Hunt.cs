using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly HashSet<string> rewardedRouteNodeIds = new(StringComparer.Ordinal);
    private RefugeMark? refuge;

    public HuntSelection? SelectedHunt { get; private set; }
    /// <summary>The reclaimed refuge a fall now returns to, or null while none is held.</summary>
    public string? RefugeNodeId => refuge?.NodeId;
    public int RefugeReturns { get; private set; }
    /// <summary>Unsecured Essences and salvage lost by the most recent return to the refuge.</summary>
    public int LastRefugeLoss { get; private set; }

    internal void SelectHunt(HuntSelection? hunt)
    {
        hunt?.Validate();
        SelectedHunt = hunt;
        if (hunt is not null)
        {
            attractedDragon = hunt.Target;
            mapState = CreateSeededMapState(depthState.Depth);
        }
    }

    private bool SelectedAscendantHunt(DragonId wyrm) => SelectedHunt is { Tier: WyrmTier.Ascendant } hunt && hunt.Target == wyrm;

    private void TrySecureRefuge(WyrmrealmMapNode node)
    {
        if (!node.Refuge || SelectedHunt is not { HasRefuge: true } || refuge is not null) return;
        refuge = new(node.Id, completedRouteNodes.Count, materialCargoState.Pending.Count, essenceCargoState.Pending.Count,
            build.DragonEssences.Selected, dragonsSlain, defeatedDragonIds.ToHashSet(), ascendantVictories.ToHashSet());
    }

    /// <summary>
    /// A fall after the refuge is reclaimed rewinds the Hunt to it. Essences and salvage gathered since are lost; levels,
    /// spells and relics already earned stay, and route rewards are never paid twice.
    /// </summary>
    private bool TryReturnToRefuge()
    {
        if (refuge is not { } mark || !mapState.ReturnToRefuge(mark.NodeId)) return false;
        LastRefugeLoss = materialCargoState.LosePendingAfter(mark.PendingMaterials) + essenceCargoState.LosePendingAfter(mark.PendingEssences);
        foreach (var essence in build.DragonEssences.Selected.Where(id => !mark.Essences.Contains(id))) build.DragonEssences.Remove(essence);
        pendingDragonEssenceChoices = [];
        completedRouteNodes.RemoveRange(mark.CompletedRouteNodes, completedRouteNodes.Count - mark.CompletedRouteNodes);
        dragonsSlain = mark.DragonsSlain;
        defeatedDragonIds.Clear();
        defeatedDragonIds.UnionWith(mark.DefeatedDragons);
        ascendantVictories.Clear();
        ascendantVictories.UnionWith(mark.AscendantVictories);
        extractionState.Cancel();
        dragon = null;
        dragonPending = false;
        dragonEncounterStarted = false;
        ascendantActive = false;
        ResetDragonHunt();
        trailExitPending = false;
        mapEncounterCleanupPending = false;
        ClearMapEncounterField();
        RefreshDragonEssenceModifiers();
        player.Health = player.MaxHealth;
        playerPositionInitialized = false;
        spawnTimer = 0;
        RefugeReturns++;
        return true;
    }

    private sealed record RefugeMark(string NodeId, int CompletedRouteNodes, int PendingMaterials, int PendingEssences,
        IReadOnlySet<DragonEssenceId> Essences, int DragonsSlain, IReadOnlySet<DragonId> DefeatedDragons, IReadOnlySet<DragonId> AscendantVictories);
}
