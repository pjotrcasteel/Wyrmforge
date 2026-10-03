using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly CombatSpatialIndex combatSpatialIndex = new();
    private readonly List<ICombatTarget> spatialQueryBuffer = [];

    private bool HasCombatTargets
    {
        get
        {
            foreach (var enemy in enemies)
            {
                if (enemy.Health > 0) return true;
            }

            return dragon is { Health: > 0 };
        }
    }

    private ICombatTarget? FirstCollidingTarget(Vector2D position, double radius, int ignoreId = 0) => combatSpatialIndex.FirstCollidingTarget(position, radius, ignoreId);

    private ICombatTarget? NearestTarget(Vector2D position, IReadOnlySet<int>? excludedIds = null, double minimumDistance = 0)
    {
        ICombatTarget? nearest = null;
        var nearestDistance = double.MaxValue;

        foreach (var enemy in enemies)
        {
            if (enemy.Health <= 0 || excludedIds?.Contains(enemy.Id) == true) continue;
            var distance = Vector2D.Distance(position, enemy.Position);
            if (distance <= minimumDistance || distance >= nearestDistance) continue;
            nearest = enemy;
            nearestDistance = distance;
        }

        if (dragon is not { Health: > 0 } activeDragon || excludedIds?.Contains(activeDragon.Id) == true) return nearest;
        var dragonDistance = Vector2D.Distance(position, activeDragon.Position);
        if (dragonDistance <= minimumDistance || dragonDistance >= nearestDistance) return nearest;
        return activeDragon;
    }

    private void RebuildCombatSpatialIndex() => combatSpatialIndex.Rebuild(enemies, dragon);

    private static void ApplyFreeze(ICombatTarget target, double duration)
    {
        var adjustedDuration = target is DragonState ? duration * 0.35 : duration;
        target.FrozenFor = Math.Max(target.FrozenFor, adjustedDuration);
    }
}
