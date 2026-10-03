using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private void RegisterFrostNova(ProjectileState projectile, Vector2D position, int hitTargetId)
    {
        if (projectile.FrostNovaRadius <= 0) return;
        combatSpatialIndex.CollectWithinRadius(position, projectile.FrostNovaRadius, hitTargetId, spatialQueryBuffer);
        foreach (var target in spatialQueryBuffer) ApplyFreeze(target, FrostShardMastery.NovaFreezeSeconds);
        RegisterFrostNovaFeedback(position, projectile.FrostNovaRadius);
    }

    private void RegisterFrostNovaFeedback(Vector2D position, double radius)
    {
        RegisterElementalImpact(position, SpellId.FrostShard);
        const int shardCount = 6;
        var visualRadius = radius * 0.72;
        for (var index = 0; index < shardCount; index++)
        {
            var angle = Math.PI * 2 * index / shardCount;
            var shardPosition = new Vector2D(position.X + Math.Cos(angle) * visualRadius, position.Y + Math.Sin(angle) * visualRadius);
            RegisterElementalImpact(shardPosition, SpellId.FrostShard);
        }
    }
}
