using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Targets;
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
        HashSet<ProjectileState>? consumed = null;
        List<ProjectileState>? spawned = null;
        foreach (var projectile in projectiles)
        {
            var target = FirstCollidingTarget(projectile.Position, projectile.Radius, projectile.IgnoredTargetId);
            if (target is null) continue;
            hitCount++;
            var damage = projectile.Damage;
            var synergySplash = 0d;
            if (projectile.Spell == SpellId.FireBolt && build.Synergies.Contains(SynergyId.Frostfire) && target.FrozenFor > 0)
            {
                damage *= 2;
                synergySplash = 92;
            }
            if (passiveProfile.Detonation && hitCount % 4 == 0) damage *= passiveProfile.Volcanic ? 2.5 : 2;
            if (passiveProfile.AbsoluteZero && target.FrozenFor > 0) damage *= 2;

            RegisterElementalImpact(target.Position, projectile.Spell);
            RegisterBurningGround(projectile, target.Position);
            var spawnedForHit = projectile.ChainsLeft > 0 ? spawned ??= [] : null;
            var killed = DamageTarget(target, damage, projectile, spawnedForHit);
            ApplyDragonEssenceImpactEffects(target, damage, ref killed);
            if (!killed && projectile.FreezeDuration > 0) ApplyFreeze(target, projectile.FreezeDuration);
            var runFreeze = modifiers.FreezeEveryHits > 0 && hitCount % modifiers.FreezeEveryHits == 0;
            if (!killed && ((passiveProfile.DeepFreeze && hitCount % 4 == 0) || runFreeze)) ApplyFreeze(target, runFreeze ? modifiers.FreezeDuration : 1.25);

            if (projectile.SplashRadius > 0) Splash(target.Position, damage * 0.4, projectile.SplashRadius, target.Id);
            if (synergySplash > 0) Splash(target.Position, damage * 0.45, synergySplash, target.Id);
            if (passiveProfile.Wildfire) Splash(target.Position, damage * 0.35, passiveProfile.Volcanic ? 90 : 64, target.Id);

            if (projectile.Spell == SpellId.ArcaneOrb)
            {
                arcaneHitCount++;
                if (build.Synergies.Contains(SynergyId.ArcaneConduit) && arcaneHitCount % 4 == 0) CastChainLightning(1, target.Position, 0.55, 1);
            }
            if (!projectile.ContinueAfterHit(target.Id)) (consumed ??= []).Add(projectile);
        }
        if (consumed is not null) projectiles.RemoveAll(consumed.Contains);
        if (spawned is not null) projectiles.AddRange(spawned);
    }

    private bool DamageTarget(ICombatTarget target, double damage, ProjectileState? source = null, List<ProjectileState>? spawned = null)
    {
        if (target.Health <= 0 || damage <= 0) return false;
        target.Health -= damage;
        RegisterTargetHit(target);
        if (target.Health > 0) return false;

        switch (target)
        {
            case EnemyState defeatedEnemy:
                RegisterEnemyDeath(defeatedEnemy);
                kills++;
                var baseScore = 100 + (int)(elapsed * 2);
                score += (int)(baseScore * depthState.ScoreMultiplier);
                GainExperience(1);
                break;
            case DragonState defeatedDragon:
                DefeatDragon(defeatedDragon);
                break;
            default:
                throw new InvalidOperationException($"Unsupported combat target type {target.GetType().Name}.");
        }

        if (source is not null && source.ChainsLeft > 0 && spawned is not null) ChainFrom(target.Position, source, spawned);
        return true;
    }

    private void Splash(Vector2D position, double damage, double radius, int ignoreId)
    {
        RegisterSplashPulse(position, radius);
        combatSpatialIndex.CollectWithinRadius(position, radius, ignoreId, spatialQueryBuffer);
        foreach (var target in spatialQueryBuffer) DamageTarget(target, damage);
    }

    private void ChainFrom(Vector2D position, ProjectileState source, ICollection<ProjectileState> spawned)
    {
        var target = NearestTarget(position, minimumDistance: 12);
        if (target is null) return;
        var direction = Vector2D.DirectionTo(position, target.Position);
        var speed = source.Velocity.Length * 1.2;
        var effects = new ProjectileEffects(false, source.ChainsLeft - 1, source.SplashRadius, source.FreezeDuration, 0);
        spawned.Add(new ProjectileState(position, direction * speed, Math.Max(4, source.Radius - 1), source.Damage * 0.82, source.Spell, effects));
    }

    private static bool IsOnScreen(Vector2D position, double width, double height, double margin) => position.X >= -margin && position.Y >= -margin && position.X <= width + margin && position.Y <= height + margin;

    private sealed class LightningTrace(Vector2D from, Vector2D to, double life)
    {
        public Vector2D From { get; } = from;

        public Vector2D To { get; } = to;

        public double Life { get; set; } = life;
    }
}
