using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly Queue<SpellSchool> pendingAttunements = new();
    private readonly EncounterDirector encounterDirector = new();
    private WyrmrealmEncounterModifierSet encounterModifiers = WyrmrealmEncounterModifierSet.Empty;
    private bool mapEncounterCleanupPending;

    public int CurrentMapNodeKills => mapState.CurrentNodeKills;
    public int CurrentMapNodeKillsRequired => mapState.CurrentNodeKillsRequired;
    public EncounterPhase? CurrentEncounterPhase => encounterDirector.Active ? encounterDirector.Phase : null;
    public IReadOnlyList<SpellSchool> PendingAttunements => pendingAttunements.ToArray();

    private TrailRenderSnapshot? CreateTrailSnapshot()
    {
        if (!mapState.EncounterActive || !encounterDirector.Active) return null;
        var phase = encounterDirector.Phase;
        var phaseProgress = encounterDirector.PhaseProgress;
        var phaseFraction = phase switch
        {
            EncounterPhase.Pressure => phaseProgress * 0.25,
            EncounterPhase.Escalation => 0.25 + phaseProgress * 0.25,
            EncounterPhase.BreathingRoom => 0.5,
            EncounterPhase.Surge => 0.5 + phaseProgress * 0.25,
            _ => 0.75 + phaseProgress * 0.25,
        };
        var killProgress = CurrentMapNodeKills / (double)Math.Max(1, CurrentMapNodeKillsRequired);
        var seconds = (int)Math.Ceiling(Math.Max(0, encounterDirector.PhaseDuration - encounterDirector.PhaseElapsed));
        var status = seconds > 0 ? $"{seconds}s" : "Clear enemies";
        var objective = killProgress >= 1 ? "Hold the trail" : $"{CurrentMapNodeKills}/{CurrentMapNodeKillsRequired} kills";
        return new(Math.Min(killProgress, phaseFraction), status, objective);
    }

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
        encounterDirector.Start(encounterPattern, depthState.Depth, node.Stage);
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
        encounterDirector.RegisterProgress(mapState.CurrentNodeKills + 1, mapState.CurrentNodeKillsRequired);
        if (!mapState.RegisterKill(encounterDirector.CanComplete) || completedNode is null) return;
        CompleteTrail(completedNode);
    }

    private void CompleteTrail(WyrmrealmMapNode completedNode)
    {
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
        if (reward.Relic is not null) OfferRelicChoice(reward.AttunementSchool);
        var recovery = reward.RecoveryFraction * encounterModifiers.RecoveryMultiplier;
        if (recovery > 0 && player.Health > 0) player.Health = Math.Min(player.MaxHealth, player.Health + player.MaxHealth * recovery);
    }

    private void CompleteMapEncounterCleanup()
    {
        if (!mapEncounterCleanupPending) return;
        ClearMapEncounterField();
        mapEncounterCleanupPending = false;
        TryLevelUp();
    }

    private void ClearMapEncounterField()
    {
        CollectLooseExperienceShards();
        enemies.Clear();
        pendingRelicBursts.Clear();
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
        encounterDirector.Reset();
        encounterModifiers = WyrmrealmEncounterModifierSet.Empty;
    }

    private static EnemyEncounterPattern ToEnemyEncounterPattern(WyrmrealmEncounterKind kind) => kind switch
    {
        WyrmrealmEncounterKind.Swarm => EnemyEncounterPattern.Swarm,
        WyrmrealmEncounterKind.StalkerPressure => EnemyEncounterPattern.StalkerPressure,
        _ => EnemyEncounterPattern.Mixed,
    };
}
