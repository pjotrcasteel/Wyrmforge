using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private void UpdateSpawn(double delta, double width, double height)
    {
        if (dragon is { Health: > 0 }) return;
        spawnTimer -= delta;
        if (spawnTimer > 0) return;
        SpawnEnemy(width, height);
        var baseInterval = Math.Max(0.28, 0.9 - elapsed / 120);
        spawnTimer = baseInterval * depthState.SpawnIntervalMultiplier;
    }

    private void SpawnEnemy(double width, double height)
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
        var scale = 1 + elapsed / 80;
        var health = 36 * scale * depthState.EnemyHealthMultiplier;
        var speed = (48 + Math.Min(52, elapsed * 0.4)) * depthState.EnemySpeedMultiplier;
        var id = ++enemyId;
        var kind = id % 6 == 0 ? EnemyKind.RiftStalker : EnemyKind.Chaser;
        var radius = kind == EnemyKind.RiftStalker ? 14 : 11;
        enemies.Add(new EnemyState(id, position, radius, health, speed, kind));
    }

    private void UpdateEnemies(double delta)
    {
        foreach (var enemy in enemies)
        {
            enemy.FrozenFor = Math.Max(0, enemy.FrozenFor - delta);
            if (enemy.FrozenFor > 0) continue;

            var direction = Vector2D.DirectionTo(enemy.Position, player.Position);
            var speed = enemy.Speed;
            var contactDamagePerSecond = 18d;
            if (enemy.RiftStalker is { } stalker)
            {
                var windupStarted = stalker.Tick(delta, enemy.Position, player.Position);
                if (windupStarted) RegisterSplashPulse(enemy.Position, 44, RiftStalkerBehaviorState.WindupSeconds);
                if (stalker.IsWindingUp) continue;
                if (stalker.IsLunging)
                {
                    direction = stalker.LungeDirection;
                    speed *= 4;
                    contactDamagePerSecond = 72;
                }
            }

            enemy.Position += direction * speed * delta;
            if (Vector2D.Distance(enemy.Position, player.Position) <= enemy.Radius + player.Radius) DamagePlayer(contactDamagePerSecond * delta);
        }
    }

    private void DamagePlayer(double rawDamage)
    {
        if (passiveProfile.WinterShell && player.Barrier)
        {
            player.Barrier = false;
            player.WinterShellRechargeRemaining = 5;
            return;
        }

        player.Health -= rawDamage * passiveProfile.DamageTakenMultiplier;
        if (!passiveProfile.IceArmor || player.Barrier) return;
        player.Barrier = true;
        player.BarrierRemaining = 1.2;
    }
}
