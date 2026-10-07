using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Statuses;
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

            return dragonHuntState.CanTargetDragon && dragon is { Health: > 0 };
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

        if (!dragonHuntState.CanTargetDragon || dragon is not { Health: > 0 } activeDragon || excludedIds?.Contains(activeDragon.Id) == true) return nearest;
        var dragonDistance = Vector2D.Distance(position, activeDragon.Position);
        if (dragonDistance <= minimumDistance || dragonDistance >= nearestDistance) return nearest;
        return activeDragon;
    }

    private IReadOnlyList<ICombatTarget> NearestTargets(Vector2D position, int count)
    {
        if (count <= 0) return Array.Empty<ICombatTarget>();

        var candidates = enemies
            .Where(enemy => enemy.Health > 0)
            .Cast<ICombatTarget>()
            .ToList();

        if (dragonHuntState.CanTargetDragon && dragon is { Health: > 0 } activeDragon) candidates.Add(activeDragon);

        return candidates
            .OrderBy(target => Vector2D.Distance(position, target.Position))
            .ThenBy(target => target.Id)
            .Take(count)
            .ToArray();
    }

    private void RebuildCombatSpatialIndex() => combatSpatialIndex.Rebuild(enemies, dragonHuntState.CanTargetDragon ? dragon : null);

    private static void ApplyStatus(ICombatTarget target, CombatStatusId status, double duration)
    {
        var definition = CombatStatusCatalog.Get(status);
        var adjustedDuration = target is DragonState ? duration * definition.BossDurationMultiplier : duration;
        target.Statuses.Apply(definition, adjustedDuration);
    }

    private static void ApplyFreeze(ICombatTarget target, double duration) => ApplyStatus(target, CombatStatusId.Frozen, duration);
}
