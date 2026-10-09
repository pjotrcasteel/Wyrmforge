using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private EnemyEncounterPattern encounterPattern = EnemyEncounterPattern.Mixed;
    private EnemyCompositionPlan? encounterPlan;
    private int encounterPlanIndex;

    private void UpdateSpawn(double delta, double width, double height)
    {
        if (developmentHunt || dragon is { Health: > 0 }) return;
        var mapEncounter = mapState.EncounterActive;
        if (mapEncounter)
        {
            encounterDirector.Tick(delta);
            if (encounterDirector.CanComplete && mapState.CurrentNode is { } completed && mapState.TryCompleteEncounter())
            {
                CompleteTrail(completed);
                return;
            }
        }
        if (mapEncounter && encounterDirector.Directive.SuppressSpawns)
        {
            spawnTimer = Math.Max(spawnTimer, 0.08);
            return;
        }

        spawnTimer -= delta;
        if (spawnTimer > 0) return;

        var openingTrail = mapEncounter && depthState.Depth == 1 && mapState.CurrentNode?.Stage == 1;
        var activeCap = openingTrail ? 8 : EnemyEncounterComposition.GetActiveEnemyCap(depthState.Depth);
        if (enemies.Count >= activeCap)
        {
            spawnTimer = 0.08;
            return;
        }

        var directive = mapEncounter ? encounterDirector.Directive : EncounterDirective.Default;
        var batchSize = EnemyEncounterComposition.GetSpawnBatchSize(encounterPattern, randomSource) + directive.BatchSizeBonus;
        var spawned = 0;
        if (mapEncounter && enemies.Count < activeCap && encounterDirector.TryTakeInsert(out var insert))
        {
            SpawnEnemy(width, height, insert);
            spawned++;
        }

        for (var index = spawned; index < batchSize && enemies.Count < activeCap; index++)
        {
            EnsureEncounterPlan(mapEncounter);
            if (encounterPlan is null || encounterPlanIndex >= encounterPlan.Enemies.Count) break;
            SpawnEnemy(width, height, encounterPlan.Enemies[encounterPlanIndex++]);
        }

        var stage = mapState.CurrentNode?.Stage ?? 1;
        var baseInterval = EnemyStagePressure.SpawnIntervalSeconds(stage);
        var routeMultiplier = Math.Max(0.35, CurrentRoute?.Encounter.SpawnIntervalMultiplier ?? 1);
        spawnTimer = baseInterval * depthState.SpawnIntervalMultiplier * EnemyEncounterComposition.GetSpawnIntervalMultiplier(encounterPattern) * routeMultiplier
            * encounterModifiers.SpawnIntervalMultiplier * directive.SpawnIntervalMultiplier * (openingTrail ? 1.75 : 1);
    }

    private void EnsureEncounterPlan(bool mapEncounter)
    {
        if (encounterPlan is not null && encounterPlanIndex < encounterPlan.Enemies.Count) return;
        if (!mapEncounter) encounterPattern = EnemyEncounterComposition.SelectNext(encounterPattern, randomSource.Next(2));
        var threatBudget = depthState.ThreatBudgetMultiplier * encounterModifiers.ThreatBudgetMultiplier;
        encounterPlan = EnemyEncounterComposition.CreatePlan(encounterPattern, depthState.Depth, randomSource, threatBudget);
        encounterPlanIndex = 0;
    }

    private void SpawnEnemy(double width, double height, EnemyKind kind)
    {
        const double margin = 30;
        var edge = Wyrmforge.Application.Runs.Navigation.WyrmrealmStageCatalog.SpawnEdge(mapState.CurrentNode?.Stage ?? 1, enemyId, randomSource.Next(4));
        var position = edge switch
        {
            0 => new Vector2D(randomSource.NextDouble() * width, -margin),
            1 => new Vector2D(width + margin, randomSource.NextDouble() * height),
            2 => new Vector2D(randomSource.NextDouble() * width, height + margin),
            _ => new Vector2D(-margin, randomSource.NextDouble() * height),
        };
        var definition = EnemyCatalog.Get(kind);
        var stage = mapState.CurrentNode?.Stage ?? 1;
        var routeHealth = Math.Max(0.25, CurrentRoute?.Encounter.EnemyHealthMultiplier ?? 1) * encounterModifiers.EnemyHealthMultiplier;
        var routeSpeed = Math.Max(0.25, CurrentRoute?.Encounter.EnemySpeedMultiplier ?? 1) * encounterModifiers.EnemySpeedMultiplier;
        var health = EnemyStagePressure.BaseHealth * EnemyStagePressure.HealthMultiplier(stage) * depthState.EnemyHealthMultiplier * routeHealth
            * definition.HealthMultiplier;
        var speed = EnemyStagePressure.BaseSpeed * EnemyStagePressure.SpeedMultiplier(stage) * depthState.EnemySpeedMultiplier * routeSpeed
            * definition.SpeedMultiplier;
        enemies.Add(new EnemyState(++enemyId, position, definition.Radius, health, speed, kind));
    }

    private void UpdateEnemies(double delta)
    {
        foreach (var enemy in enemies)
        {
            enemy.Statuses.Tick(delta);
            var statusTimeScale = enemy.Statuses.TimeScale(false);
            if (statusTimeScale <= 0) continue;

            var scaledDelta = delta * statusTimeScale;
            var direction = Vector2D.DirectionTo(enemy.Position, player.Position);
            var speed = enemy.Speed;
            var contactDamagePerSecond = 18d * EnemyCatalog.Get(enemy.Kind).ContactDamageMultiplier;
            if (enemy.RiftStalker is { } stalker)
            {
                var windupStarted = stalker.Tick(scaledDelta, enemy.Position, player.Position);
                if (windupStarted) RegisterSplashPulse(enemy.Position, 44, RiftStalkerBehaviorState.WindupSeconds);
                if (stalker.IsWindingUp) continue;
                if (stalker.IsLunging)
                {
                    direction = stalker.LungeDirection;
                    speed *= 4;
                    contactDamagePerSecond *= 4;
                }
            }

            enemy.Position += direction * speed * scaledDelta;
            if (delta > 0 && Vector2D.Distance(enemy.Position, player.Position) <= enemy.Radius + player.Radius) DamagePlayerContact(contactDamagePerSecond * statusTimeScale);
        }
    }

}
