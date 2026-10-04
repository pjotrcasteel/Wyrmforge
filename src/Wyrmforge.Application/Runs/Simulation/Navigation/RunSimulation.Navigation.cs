using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private bool mapEncounterCleanupPending;

    public bool ChooseMapNode(string id)
    {
        if (depthState.Depth != 1 || initialDragonEncounterStarted) return false;
        var node = mapState.Choose(id);
        if (node is null) return false;

        ClearMapEncounterField();
        if (node.Type == WyrmrealmNodeType.Dragon)
        {
            initialDragonPending = true;
            return true;
        }

        encounterPattern = ToEnemyEncounterPattern(node.EncounterKind ?? throw new InvalidOperationException("Combat nodes require an encounter kind."));
        encounterSpawnIndex = 0;
        spawnTimer = 0.15;
        return true;
    }

    private void RegisterMapEncounterKill()
    {
        if (depthState.Depth != 1 || initialDragonEncounterStarted || !mapState.EncounterActive) return;
        if (mapState.RegisterKill()) mapEncounterCleanupPending = true;
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
    }

    private static EnemyEncounterPattern ToEnemyEncounterPattern(WyrmrealmEncounterKind kind) => kind switch
    {
        WyrmrealmEncounterKind.Swarm => EnemyEncounterPattern.Swarm,
        WyrmrealmEncounterKind.StalkerPressure => EnemyEncounterPattern.StalkerPressure,
        _ => EnemyEncounterPattern.Mixed,
    };
}
