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
        if (developmentHunt || trailExitPending || dragon is { Health: > 0 }) return;
        if (entryGraceRemaining > 0)
        {
            entryGraceRemaining = Math.Max(0, entryGraceRemaining - delta);
            return;
        }
        var mapEncounter = mapState.EncounterActive;
        if (mapEncounter)
        {
            encounterDirector.Tick(delta);
            arenaEnvironment?.SetPhase(encounterDirector.Phase);
            if (encounterDirector.CanComplete && mapState.CurrentNodeKills >= mapState.CurrentNodeKillsRequired)
            {
                // Stop spawning after the finale, but do not open a passage with live enemies on the floor.
                if (enemies.Count == 0 && mapState.CurrentNode is { } completed && mapState.TryCompleteEncounter())
                    CompleteTrail(completed);
                spawnTimer = 0.08;
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

        var stage = mapState.CurrentNode?.Stage ?? 1;
        var activeCap = mapEncounter ? EnemyStagePressure.ActiveEnemyCap(stage, depthState.Depth) : EnemyEncounterComposition.GetActiveEnemyCap(depthState.Depth);
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

        var baseInterval = EnemyStagePressure.SpawnIntervalSeconds(stage);
        var routeMultiplier = Math.Max(0.35, CurrentRoute?.Encounter.SpawnIntervalMultiplier ?? 1);
        spawnTimer = baseInterval * depthState.SpawnIntervalMultiplier * EnemyEncounterComposition.GetSpawnIntervalMultiplier(encounterPattern) * routeMultiplier
            * encounterModifiers.SpawnIntervalMultiplier * directive.SpawnIntervalMultiplier * (mapEncounter ? EnemyStagePressure.OpeningSpawnIntervalMultiplier(stage, depthState.Depth) : 1);
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
        var edge = encounterPattern switch
        {
            EnemyEncounterPattern.Swarm => enemyId % 2 * 2,
            EnemyEncounterPattern.StalkerPressure => enemyId % 4,
            _ => randomSource.Next(4),
        };
        // Spawn around the hunter's *camera*, not at the remote edge of a multi-screen world.
        // Otherwise roaming makes the opening waves invisible and changes encounter difficulty.
        var localWidth = mapState.EncounterActive ? viewportWidth : width;
        var localHeight = mapState.EncounterActive ? viewportHeight : height;
        var horizontal = (randomSource.NextDouble() - 0.5) * localWidth;
        var vertical = (randomSource.NextDouble() - 0.5) * localHeight;
        var position = edge switch
        {
            0 => new Vector2D(player.Position.X + horizontal, player.Position.Y - localHeight / 2 - margin),
            1 => new Vector2D(player.Position.X + localWidth / 2 + margin, player.Position.Y + vertical),
            2 => new Vector2D(player.Position.X + horizontal, player.Position.Y + localHeight / 2 + margin),
            _ => new Vector2D(player.Position.X - localWidth / 2 - margin, player.Position.Y + vertical),
        };
        position = new Vector2D(Math.Clamp(position.X, margin, Math.Max(margin, width - margin)),
            Math.Clamp(position.Y, margin, Math.Max(margin, height - margin)));
        var definition = EnemyCatalog.Get(kind);
        var stage = mapState.CurrentNode?.Stage ?? 1;
        var routeHealth = Math.Max(0.25, CurrentRoute?.Encounter.EnemyHealthMultiplier ?? 1) * encounterModifiers.EnemyHealthMultiplier;
        var routeSpeed = Math.Max(0.25, CurrentRoute?.Encounter.EnemySpeedMultiplier ?? 1) * encounterModifiers.EnemySpeedMultiplier;
        var health = EnemyStagePressure.BaseHealth * EnemyStagePressure.HealthMultiplier(stage) * depthState.EnemyHealthMultiplier * routeHealth
            * definition.HealthMultiplier;
        var speed = EnemyStagePressure.BaseSpeed * EnemyStagePressure.SpeedMultiplier(stage) * depthState.EnemySpeedMultiplier * routeSpeed
            * definition.SpeedMultiplier;
        if (mapState.EncounterActive && arenaEnvironment is not null)
            position = arenaEnvironment.AdjustSpawnPosition(position, player.Position, width, height, definition.Radius);
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
            var target = mapState.EncounterActive && arenaEnvironment is not null
                ? arenaEnvironment.EnemyNavigationTarget(enemy.Position, player.Position, arenaWidth, arenaHeight, enemy.Radius)
                : player.Position;
            var direction = Vector2D.DirectionTo(enemy.Position, target);
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

            var previous = enemy.Position;
            var proposed = previous + direction * speed * scaledDelta;
            enemy.Position = mapState.EncounterActive && arenaEnvironment is not null
                ? arenaEnvironment.RestrictMovement(previous, proposed, arenaWidth, arenaHeight, enemy.Radius)
                : proposed;
            if (delta > 0 && Vector2D.Distance(enemy.Position, player.Position) <= enemy.Radius + player.Radius) DamagePlayerContact(contactDamagePerSecond * statusTimeScale);
        }
    }

}
