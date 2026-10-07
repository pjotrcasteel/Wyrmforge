using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly Queue<SpellSchool> pendingAttunements = new();
    private WyrmrealmEncounterModifierSet encounterModifiers = WyrmrealmEncounterModifierSet.Empty;
    private bool mapEncounterCleanupPending;

    public int CurrentMapNodeKills => mapState.CurrentNodeKills;
    public int CurrentMapNodeKillsRequired => WyrmrealmMapState.KillsPerCombatNode;
    public IReadOnlyList<SpellSchool> PendingAttunements => pendingAttunements.ToArray();

    private WyrmrealmRouteProfile? CurrentRoute => mapState.EncounterActive ? mapState.CurrentNode?.Route : null;

    public bool ChooseMapNode(string id)
    {
        if (dragonEncounterStarted) return false;
        var node = mapState.Choose(id);
        if (node is null) return false;
        ClearMapEncounterField();
        if (node.Type == WyrmrealmNodeType.Dragon)
        {
            ResolveDragonAttraction();
            dragonPending = true;
            return true;
        }

        var route = node.Route ?? throw new InvalidOperationException("Combat nodes require a route profile.");
        encounterPattern = ToEnemyEncounterPattern(route.Encounter.Kind);
        encounterModifiers = ResolveEncounterModifiers(route);
        spawnTimer = 0.15;
        return true;
    }

    private WyrmrealmEncounterModifierSet ResolveEncounterModifiers(WyrmrealmRouteProfile route)
    {
        var routeModifiers = route.EncounterModifiers ?? Array.Empty<WyrmrealmEncounterModifier>();
        var influenceModifiers = realmInfluenceState.CalculateEncounterModifiers(CurrentDragonAttention);
        return WyrmrealmEncounterModifierSet.Aggregate([.. routeModifiers, .. influenceModifiers]);
    }

    private void RegisterMapEncounterKill()
    {
        if (dragonEncounterStarted || !mapState.EncounterActive) return;
        var completedNode = mapState.CurrentNode;
        if (!mapState.RegisterKill() || completedNode is null) return;
        completedRouteNodes.Add(completedNode);
        RefreshBuildModifiers(true);
        ApplyRouteReward(completedNode.Route?.Reward);
        if (completedNode.Stage == WyrmrealmMapState.CombatStages) ResolveDragonAttraction();
        mapEncounterCleanupPending = true;
    }

    private void ApplyRouteReward(WyrmrealmRewardProfile? reward)
    {
        if (reward is null) return;
        pendingAttunements.Enqueue(reward.AttunementSchool);
        score += (int)(reward.ScoreBonus * depthState.ScoreMultiplier);
        if (reward.Relic is not null) OfferRelicChoice();
        var recovery = reward.RecoveryFraction * encounterModifiers.RecoveryMultiplier;
        if (recovery > 0 && player.Health > 0) player.Health = Math.Min(player.MaxHealth, player.Health + player.MaxHealth * recovery);
    }

    private void CompleteMapEncounterCleanup()
    {
        if (!mapEncounterCleanupPending) return;
        ClearMapEncounterField();
        mapEncounterCleanupPending = false;
    }

    private void ClearMapEncounterField()
    {
        CollectLooseExperienceShards();
        enemies.Clear();
        projectiles.Clear();
        lightning.Clear();
        burningGrounds.Clear();
        essenceBursts.Clear();
        essenceBolts.Clear();
        hitFlashRemaining.Clear();
        splashPulses.Clear();
        elementalImpacts.Clear();
        deathBursts.Clear();
        unstableRiftState.Reset();
        encounterPlan = null;
        encounterPlanIndex = 0;
        encounterModifiers = WyrmrealmEncounterModifierSet.Empty;
    }

    private static EnemyEncounterPattern ToEnemyEncounterPattern(WyrmrealmEncounterKind kind) => kind switch
    {
        WyrmrealmEncounterKind.Swarm => EnemyEncounterPattern.Swarm,
        WyrmrealmEncounterKind.StalkerPressure => EnemyEncounterPattern.StalkerPressure,
        _ => EnemyEncounterPattern.Mixed,
    };
}
