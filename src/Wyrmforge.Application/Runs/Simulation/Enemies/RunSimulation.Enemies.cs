using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private EnemyEncounterPattern encounterPattern = EnemyEncounterPattern.Mixed;
    private EnemyCompositionPlan? encounterPlan;
    private int encounterPlanIndex;

    private void UpdateSpawn(double delta, double width, double height)
    {
        if (dragon is { Health: > 0 }) return;
        var mapEncounter = mapState.EncounterActive;

        spawnTimer -= delta;
        if (spawnTimer > 0) return;

        var activeCap = EnemyEncounterComposition.GetActiveEnemyCap(depthState.Depth);
        if (enemies.Count >= activeCap)
        {
            spawnTimer = 0.08;
            return;
        }

        var batchSize = EnemyEncounterComposition.GetSpawnBatchSize(encounterPattern, randomSource);
        for (var index = 0; index < batchSize && enemies.Count < activeCap; index++)
        {
            EnsureEncounterPlan(mapEncounter);
            if (encounterPlan is null || encounterPlanIndex >= encounterPlan.Enemies.Count) break;
            SpawnEnemy(width, height, encounterPlan.Enemies[encounterPlanIndex++]);
        }

        var baseInterval = Math.Max(0.24, 0.72 - elapsed / 180);
        var routeMultiplier = Math.Max(0.35, CurrentRoute?.Encounter.SpawnIntervalMultiplier ?? 1);
        spawnTimer = baseInterval * depthState.SpawnIntervalMultiplier * EnemyEncounterComposition.GetSpawnIntervalMultiplier(encounterPattern) * routeMultiplier
            * encounterModifiers.SpawnIntervalMultiplier;
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
        var edge = randomSource.Next(4);
        var position = edge switch
        {
            0 => new Vector2D(randomSource.NextDouble() * width, -margin),
            1 => new Vector2D(width + margin, randomSource.NextDouble() * height),
            2 => new Vector2D(randomSource.NextDouble() * width, height + margin),
            _ => new Vector2D(-margin, randomSource.NextDouble() * height),
        };
        var definition = EnemyCatalog.Get(kind);
        var scale = 1 + elapsed / 80;
        var routeHealth = Math.Max(0.25, CurrentRoute?.Encounter.EnemyHealthMultiplier ?? 1) * encounterModifiers.EnemyHealthMultiplier;
        var routeSpeed = Math.Max(0.25, CurrentRoute?.Encounter.EnemySpeedMultiplier ?? 1) * encounterModifiers.EnemySpeedMultiplier;
        var health = 60 * scale * depthState.EnemyHealthMultiplier * routeHealth * definition.HealthMultiplier;
        var speed = (48 + Math.Min(52, elapsed * 0.4)) * depthState.EnemySpeedMultiplier * routeSpeed * definition.SpeedMultiplier;
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
            if (Vector2D.Distance(enemy.Position, player.Position) <= enemy.Radius + player.Radius) DamagePlayer(contactDamagePerSecond * scaledDelta);
        }
    }

    private void DamagePlayer(double rawDamage)
    {
        if (passiveProfile.WinterShell && player.Barrier)
        {
            player.Barrier = false;
            player.WinterShellRechargeRemaining = PassiveEffectResolver.WinterShellRechargeSeconds;
            return;
        }

        rawDamage = ApplyChargedScale(rawDamage);
        var encounterDamage = rawDamage * passiveProfile.DamageTakenMultiplier * encounterModifiers.DamageTakenMultiplier;
        encounterDamage = PassiveEffectResolver.ApplyIceArmor(passiveProfile, player.Barrier, encounterDamage);
        player.Health -= buildModifiers.Apply(BuildStatId.DamageTaken, encounterDamage);

        if (!passiveProfile.IceArmor || passiveProfile.WinterShell || player.Barrier) return;
        player.Barrier = true;
        player.BarrierRemaining = PassiveEffectResolver.IceArmorDurationSeconds;
    }
}
