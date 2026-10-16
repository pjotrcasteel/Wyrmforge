using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly Queue<SpellSchool> pendingAttunements = new();
    private readonly EncounterDirector encounterDirector = new();
    private ArenaEnvironmentState? arenaEnvironment;
    private WyrmrealmEncounterModifierSet encounterModifiers = WyrmrealmEncounterModifierSet.Empty;
    private bool mapEncounterCleanupPending;
    private double entryGraceRemaining;
    public double EntryGraceRemaining => entryGraceRemaining;

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
        var objective = killProgress < 1 ? $"{CurrentMapNodeKills}/{CurrentMapNodeKillsRequired} kills"
            : encounterDirector.CanComplete ? $"Clear {HostileCount} remaining" : "Hold the trail";
        return new(Math.Min(killProgress, phaseFraction), status, objective);
    }

    private WyrmrealmRouteProfile? CurrentRoute => mapState.EncounterActive ? mapState.CurrentNode?.Route : null;

    public bool ChooseMapNode(string id)
    {
        if (dragonEncounterStarted || trailExitPending) return false;
        var node = mapState.Choose(id);
        if (node is null) return false;
        ClearMapEncounterField();
        playerPositionInitialized = false;
        arenaEnvironment = ArenaEnvironmentState.Create(mapState.Seed, node);
        PrepareReliquaryNode(node);
        RollNodeElite(node);
        if (node.Type == WyrmrealmNodeType.Dragon)
        {
            ResolveDragonAttraction();
            dragonPending = true;
            return true;
        }

        var route = node.Route ?? throw new InvalidOperationException("Combat nodes require a route profile.");
        encounterPattern = ToEnemyEncounterPattern(route.Encounter.Kind);
        encounterModifiers = ResolveEncounterModifiers(route);
        encounterHabitat = node.Habitat;
        encounterDirector.Start(encounterPattern, depthState.Depth, node.Stage, node.Habitat);
        arenaEnvironment.SetPhase(encounterDirector.Phase);
        entryGraceRemaining = 2;
        encounterSeconds = 0;
        ClearSupportState();
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
        encounterDirector.RegisterProgress(mapState.CurrentNodeKills + 1, mapState.CurrentNodeKillsRequired);
        // Completion is evaluated by UpdateSpawn once the last wave has no surviving enemies.
        mapState.RegisterKill(false);
    }

    private void CompleteTrail(WyrmrealmMapNode completedNode)
    {
        completedRouteNodes.Add(completedNode);
        WithdrawReliquary();
        trailExitPending = true;
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
        ClearMapEncounterField(preserveEnvironment: true);
        mapEncounterCleanupPending = false;
        TryLevelUp();
    }

    private void ClearMapEncounterField(bool preserveEnvironment = false)
    {
        entryGraceRemaining = 0;
        powerBurstRemaining = 0;
        CollectLooseExperienceShards();
        enemies.Clear();
        hostileProjectiles.Clear();
        ClearSupportState();
        ClearReliquaryState();
        encounterSeconds = 0;
        rangedStaggerRemaining = 0;
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
        encounterHabitat = null;
        encounterDirector.Reset();
        if (!preserveEnvironment) arenaEnvironment = null;
        encounterModifiers = WyrmrealmEncounterModifierSet.Empty;
    }

    private static EnemyEncounterPattern ToEnemyEncounterPattern(WyrmrealmEncounterKind kind) => kind switch
    {
        WyrmrealmEncounterKind.Swarm => EnemyEncounterPattern.Swarm,
        WyrmrealmEncounterKind.StalkerPressure => EnemyEncounterPattern.StalkerPressure,
        _ => EnemyEncounterPattern.Mixed,
    };
}
