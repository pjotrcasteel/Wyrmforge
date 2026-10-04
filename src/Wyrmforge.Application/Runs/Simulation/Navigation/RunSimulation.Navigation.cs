using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly Queue<SpellSchool> pendingAttunements = new();
    private bool mapEncounterCleanupPending;

    public int CurrentMapNodeKills => mapState.CurrentNodeKills;
    public int CurrentMapNodeKillsRequired => WyrmrealmMapState.KillsPerCombatNode;
    public IReadOnlyList<SpellSchool> PendingAttunements => pendingAttunements.ToArray();

    private WyrmrealmRouteProfile? CurrentRoute => mapState.EncounterActive ? mapState.CurrentNode?.Route : null;

    public bool ChooseMapNode(string id)
    {
        var dragonEncounterStarted = depthState.Depth == 1 ? initialDragonEncounterStarted : deepDragonEncounterStarted;
        if (dragonEncounterStarted) return false;
        var node = mapState.Choose(id);
        if (node is null) return false;

        ClearMapEncounterField();
        if (node.Type == WyrmrealmNodeType.Dragon)
        {
            ResolveDragonAttraction();
            if (depthState.Depth == 1) initialDragonPending = true;
            else deepDragonPending = true;
            return true;
        }

        var route = node.Route ?? throw new InvalidOperationException("Combat nodes require a route profile.");
        encounterPattern = ToEnemyEncounterPattern(route.Encounter.Kind);
        encounterSpawnIndex = 0;
        spawnTimer = 0.15;
        return true;
    }

    private void RegisterMapEncounterKill()
    {
        var dragonEncounterStarted = depthState.Depth == 1 ? initialDragonEncounterStarted : deepDragonEncounterStarted;
        if (dragonEncounterStarted || !mapState.EncounterActive) return;
        var completedNode = mapState.CurrentNode;
        if (!mapState.RegisterKill()) return;
        if (completedNode is null) return;

        completedRouteNodes.Add(completedNode);
        ApplyRouteReward(completedNode.Route?.Reward);
        if (completedNode.Stage == WyrmrealmMapState.CombatStages) ResolveDragonAttraction();
        mapEncounterCleanupPending = true;
    }

    private void ApplyRouteReward(WyrmrealmRewardProfile? reward)
    {
        if (reward is null) return;
        pendingAttunements.Enqueue(reward.AttunementSchool);
        score += (int)(reward.ScoreBonus * depthState.ScoreMultiplier);
        if (reward.RecoveryFraction <= 0 || player.Health <= 0) return;
        player.Health = Math.Min(player.MaxHealth, player.Health + player.MaxHealth * reward.RecoveryFraction);
    }

    private void CompleteMapEncounterCleanup()
    {
        if (!mapEncounterCleanupPending) return;
        ClearMapEncounterField();
        mapEncounterCleanupPending = false;
    }

    private void ClearMapEncounterField()
    {
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
    }

    private static EnemyEncounterPattern ToEnemyEncounterPattern(WyrmrealmEncounterKind kind) => kind switch
    {
        WyrmrealmEncounterKind.Swarm => EnemyEncounterPattern.Swarm,
        WyrmrealmEncounterKind.StalkerPressure => EnemyEncounterPattern.StalkerPressure,
        _ => EnemyEncounterPattern.Mixed,
    };
}
