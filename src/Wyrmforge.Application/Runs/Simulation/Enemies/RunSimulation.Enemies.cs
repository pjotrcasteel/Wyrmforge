using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private void UpdateSpawn(double delta, double width, double height)
    {
        spawnTimer -= delta;
        if (spawnTimer > 0) return;
        SpawnEnemy(width, height);
        spawnTimer = Math.Max(0.28, 0.9 - elapsed / 120);
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
        enemies.Add(new EnemyState(++enemyId, position, 11, 36 * scale, 48 + Math.Min(52, elapsed * 0.4)));
    }

    private void UpdateEnemies(double delta)
    {
        foreach (var enemy in enemies)
        {
            enemy.FrozenFor = Math.Max(0, enemy.FrozenFor - delta);
            if (enemy.FrozenFor > 0) continue;
            var direction = Vector2D.DirectionTo(enemy.Position, player.Position);
            enemy.Position += direction * enemy.Speed * delta;
            if (Vector2D.Distance(enemy.Position, player.Position) <= enemy.Radius + player.Radius) DamagePlayer(18 * delta);
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
