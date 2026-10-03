using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private void UpdateProjectiles(double delta, double width, double height)
    {
        foreach (var projectile in projectiles) projectile.Position += projectile.Velocity * delta;
        projectiles.RemoveAll(projectile => !IsOnScreen(projectile.Position, width, height, 80));
    }

    private void UpdateLightning(double delta)
    {
        foreach (var trace in lightning) trace.Life -= delta;
        lightning.RemoveAll(trace => trace.Life <= 0);
    }

    private void ResolveProjectileHits()
    {
        var consumed = new HashSet<ProjectileState>();
        var spawned = new List<ProjectileState>();
        foreach (var projectile in projectiles)
        {
            var enemy = enemies.FirstOrDefault(candidate => candidate.Health > 0 && Vector2D.Distance(projectile.Position, candidate.Position) <= projectile.Radius + candidate.Radius);
            if (enemy is null) continue;
            hitCount++;
            var damage = projectile.Damage;
            var synergySplash = 0d;
            if (projectile.Spell == SpellId.FireBolt && build.Synergies.Contains(SynergyId.Frostfire) && enemy.FrozenFor > 0)
            {
                damage *= 2;
                synergySplash = 92;
            }
            if (passiveProfile.Detonation && hitCount % 4 == 0) damage *= passiveProfile.Volcanic ? 2.5 : 2;
            if (passiveProfile.AbsoluteZero && enemy.FrozenFor > 0) damage *= 2;

            var killed = DamageEnemy(enemy, damage, projectile, spawned);
            if (!killed && projectile.FreezeDuration > 0) enemy.FrozenFor = Math.Max(enemy.FrozenFor, projectile.FreezeDuration);
            var runFreeze = modifiers.FreezeEveryHits > 0 && hitCount % modifiers.FreezeEveryHits == 0;
            if (!killed && ((passiveProfile.DeepFreeze && hitCount % 4 == 0) || runFreeze)) enemy.FrozenFor = Math.Max(enemy.FrozenFor, runFreeze ? modifiers.FreezeDuration : 1.25);

            if (projectile.SplashRadius > 0) Splash(enemy.Position, damage * 0.4, projectile.SplashRadius, enemy.Id);
            if (synergySplash > 0) Splash(enemy.Position, damage * 0.45, synergySplash, enemy.Id);
            if (passiveProfile.Wildfire) Splash(enemy.Position, damage * 0.35, passiveProfile.Volcanic ? 90 : 64, enemy.Id);

            if (projectile.Spell == SpellId.ArcaneOrb)
            {
                arcaneHitCount++;
                if (build.Synergies.Contains(SynergyId.ArcaneConduit) && arcaneHitCount % 4 == 0) CastChainLightning(1, enemy.Position, 0.55, 1);
            }
            consumed.Add(projectile);
        }
        projectiles.RemoveAll(consumed.Contains);
        projectiles.AddRange(spawned);
    }

    private bool DamageEnemy(EnemyState enemy, double damage, ProjectileState? source = null, List<ProjectileState>? spawned = null)
    {
        if (enemy.Health <= 0) return false;
        enemy.Health -= damage;
        if (enemy.Health > 0) return false;
        kills++;
        score += 100 + (int)(elapsed * 2);
        GainExperience(1);
        if (source is not null && source.ChainsLeft > 0 && spawned is not null) ChainFrom(enemy.Position, source, spawned);
        return true;
    }

    private void Splash(Vector2D position, double damage, double radius, int ignoreId)
    {
        foreach (var enemy in enemies.Where(enemy => enemy.Id != ignoreId && enemy.Health > 0 && Vector2D.Distance(position, enemy.Position) <= radius)) DamageEnemy(enemy, damage);
    }

    private void ChainFrom(Vector2D position, ProjectileState source, ICollection<ProjectileState> spawned)
    {
        var target = NearestEnemy(position, enemies.Where(enemy => enemy.Health > 0 && Vector2D.Distance(position, enemy.Position) > 12));
        if (target is null) return;
        var direction = Vector2D.DirectionTo(position, target.Position);
        var speed = source.Velocity.Length * 1.2;
        spawned.Add(new ProjectileState(position, direction * speed, Math.Max(4, source.Radius - 1), source.Damage * 0.82, source.Spell, false, source.ChainsLeft - 1, source.SplashRadius, source.FreezeDuration));
    }

    private static EnemyState? NearestEnemy(Vector2D position, IEnumerable<EnemyState> candidates) => candidates.OrderBy(enemy => Vector2D.Distance(position, enemy.Position)).FirstOrDefault();

    private static bool IsOnScreen(Vector2D position, double width, double height, double margin) => position.X >= -margin && position.Y >= -margin && position.X <= width + margin && position.Y <= height + margin;

    private sealed class LightningTrace(Vector2D from, Vector2D to, double life)
    {
        public Vector2D From { get; } = from;

        public Vector2D To { get; } = to;

        public double Life { get; set; } = life;
    }
}
