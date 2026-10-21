using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Loot;
using Wyrmforge.Domain.Progression.Signature;

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

    /// <summary>The tier a selected Hunt fields for its own target; any other Wyrm stays an ordinary Wyrm.</summary>
    private WyrmTier SelectedHuntTier(DragonId wyrm) => SelectedHunt is { } hunt && hunt.Target == wyrm ? hunt.Tier : WyrmTier.Wyrm;

    private void TrySecureRefuge(WyrmrealmMapNode node)
    {
        if (!node.Refuge || SelectedHunt is not { HasRefuge: true } || refuge is not null) return;
        // The harder hold pays one Rare find up front; it is taken before the mark, so later falls never cost it.
        if (HuntDrops(LootRarity.Rare)) materialCargoState.Collect(HuntMaterialId.Emberglass);
        refuge = new(node.Id, completedRouteNodes.Count, materialCargoState.Pending.Count, essenceCargoState.Pending.Count,
            build.DragonEssences.Selected, dragonsSlain, defeatedDragonIds.ToHashSet(), ascendantVictories.ToHashSet());
    }

    /// <summary>Whether the selected Hunt's tier may drop loot of this rarity. Unselected (legacy) runs drop Common only.</summary>
    private bool HuntDrops(LootRarity rarity) => SelectedHunt is { } hunt ? LootRarityRules.CanDrop(rarity, hunt.Tier) : rarity == LootRarity.Common;

    /// <summary>Rarity of an Essence harvested in this run: one step above the Hunt tier's drop cap.</summary>
    public LootRarity EssenceRarity => SelectedHunt is { } hunt ? LootRarityRules.Essence(hunt.Tier) : DragonEssenceVault.UngradedRarity;

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
