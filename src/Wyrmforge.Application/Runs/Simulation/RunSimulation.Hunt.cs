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

    // Owner playtest 2026-10-25: Tier-I bosses need meaningful time alive, not higher damage.
    // Local to Fire Tier I so the established Ascendant/Elder multipliers remain unchanged.
    public const double FireTierOneBellWardenDurability = 2.5;
    public const double FireTierOneAshfangDurability = 3.0;

    public HuntSelection? SelectedHunt { get; private set; }
    private bool IsFireTierOneHunt => SelectedHunt == HuntSelection.FireTierOne;
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
        // Reclaiming an authored refuge pays its source-specific reward before the mark, once per Hunt.
        foreach (var material in HuntLootCatalog.For(SelectedHunt).MaterialsFor(HuntLootSource.ReclaimedRefuge))
            materialCargoState.Collect(material);
        refuge = new(node.Id, completedRouteNodes.Count, materialCargoState.Pending.Count, essenceCargoState.Pending.Count,
            build.DragonEssences.Selected, dragonsSlain, defeatedDragonIds.ToHashSet(), ascendantVictories.ToHashSet());
    }

    /// <summary>Rarity of an Essence harvested in this run: one step above the Hunt tier's drop cap.</summary>
    public LootRarity EssenceRarity => HuntLootCatalog.For(SelectedHunt).BossEssenceRarity;

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
        ForgetLostScouting();
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
        walkedExitNodeId = null;
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
