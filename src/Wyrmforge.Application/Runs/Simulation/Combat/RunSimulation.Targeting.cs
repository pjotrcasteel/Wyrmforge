using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private bool HasCombatTargets => enemies.Any(enemy => enemy.Health > 0) || dragon is { Health: > 0 };

    private IEnumerable<ICombatTarget> CombatTargets()
    {
        foreach (var enemy in enemies.Where(enemy => enemy.Health > 0)) yield return enemy;
        if (dragon is { Health: > 0 } activeDragon) yield return activeDragon;
    }

    private static ICombatTarget? NearestTarget(Vector2D position, IEnumerable<ICombatTarget> candidates) => candidates.OrderBy(target => Vector2D.Distance(position, target.Position)).FirstOrDefault();

    private static void ApplyFreeze(ICombatTarget target, double duration)
    {
        var adjustedDuration = target is DragonState ? duration * 0.35 : duration;
        target.FrozenFor = Math.Max(target.FrozenFor, adjustedDuration);
    }
}
