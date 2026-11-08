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
    // Completed encounters stay spent after refuge rewind. Interrupted encounters retain the count of kills already
    // credited so a fresh enemy beyond that point can still pay, but re-killing the same progression cannot farm XP.
    private readonly HashSet<string> spentRefugeEncounterIds = new(StringComparer.Ordinal);
    private readonly Dictionary<string, int> highestCreditedKillByEncounter = new(StringComparer.Ordinal);
    private readonly HashSet<(string NodeId, double X, double Y)> creditedEncounterExperienceCaches = [];
    private string? rewardEncounterNodeId;
    private int currentEncounterKillOrdinal;
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

    private bool CanEarnEncounterRewards => rewardEncounterNodeId is null || !spentRefugeEncounterIds.Contains(rewardEncounterNodeId);

    private bool CreditEncounterKill()
    {
        if (rewardEncounterNodeId is null) return true;
        var ordinal = ++currentEncounterKillOrdinal;
        if (!CanEarnEncounterRewards) return false;
        var credited = highestCreditedKillByEncounter.GetValueOrDefault(rewardEncounterNodeId);
        if (ordinal <= credited) return false;
        highestCreditedKillByEncounter[rewardEncounterNodeId] = ordinal;
        return true;
    }

    private bool CreditEncounterExperienceCache(double x, double y) => rewardEncounterNodeId is null ||
        (CanEarnEncounterRewards && creditedEncounterExperienceCaches.Add((rewardEncounterNodeId, x, y)));

    private void AwardEncounterScore(int amount)
    {
        if (CanEarnEncounterRewards) score += amount;
    }

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
        if (refuge is not { } mark) return false;
        // Only completed encounters become entirely spent. In-progress fights still credit NEW kill ordinals on retry.
        var replayedNodeIds = mapState.CompletedNodes.Skip(mark.CompletedRouteNodes).Select(node => node.Id).ToArray();
        if (!mapState.ReturnToRefuge(mark.NodeId)) return false;
        spentRefugeEncounterIds.UnionWith(replayedNodeIds);
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
        // Uncollected drops are not part of retained XP, and are never credited merely because the player fell.
        experienceShards.Clear();
        ClearMapEncounterField();
        rewardEncounterNodeId = null;
        currentEncounterKillOrdinal = 0;
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
