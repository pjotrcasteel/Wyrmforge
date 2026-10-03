using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;

namespace Wyrmforge.Application.Runs.Simulation;

internal sealed class CombatSpatialIndex
{
    private const double CellSize = 96;
    private const double MaxTargetRadius = 40;
    private readonly Dictionary<long, List<ICombatTarget>> cells = [];

    public void Rebuild(IReadOnlyList<EnemyState> enemies, DragonState? dragon)
    {
        foreach (var targets in cells.Values) targets.Clear();

        foreach (var enemy in enemies)
        {
            if (enemy.Health > 0) Add(enemy);
        }

        if (dragon is { Health: > 0 } activeDragon) Add(activeDragon);
    }

    public ICombatTarget? FirstCollidingTarget(Vector2D position, double radius)
    {
        ICombatTarget? first = null;
        var queryRadius = radius + MaxTargetRadius;
        var minX = Cell(position.X - queryRadius);
        var maxX = Cell(position.X + queryRadius);
        var minY = Cell(position.Y - queryRadius);
        var maxY = Cell(position.Y + queryRadius);

        for (var x = minX; x <= maxX; x++)
        {
            for (var y = minY; y <= maxY; y++)
            {
                if (!cells.TryGetValue(Key(x, y), out var targets)) continue;
                foreach (var target in targets)
                {
                    if (target.Health <= 0 || Vector2D.Distance(position, target.Position) > radius + target.Radius) continue;
                    if (first is null || target.Id < first.Id) first = target;
                }
            }
        }

        return first;
    }

    public void CollectWithinRadius(Vector2D position, double radius, int ignoreId, List<ICombatTarget> buffer)
    {
        buffer.Clear();
        var minX = Cell(position.X - radius);
        var maxX = Cell(position.X + radius);
        var minY = Cell(position.Y - radius);
        var maxY = Cell(position.Y + radius);

        for (var x = minX; x <= maxX; x++)
        {
            for (var y = minY; y <= maxY; y++)
            {
                if (!cells.TryGetValue(Key(x, y), out var targets)) continue;
                foreach (var target in targets)
                {
                    if (target.Health <= 0 || target.Id == ignoreId || Vector2D.Distance(position, target.Position) > radius) continue;
                    buffer.Add(target);
                }
            }
        }
    }

    private void Add(ICombatTarget target)
    {
        var key = Key(Cell(target.Position.X), Cell(target.Position.Y));
        if (!cells.TryGetValue(key, out var targets))
        {
            targets = [];
            cells.Add(key, targets);
        }

        targets.Add(target);
    }

    private static int Cell(double value) => (int)Math.Floor(value / CellSize);

    private static long Key(int x, int y) => ((long)x << 32) ^ (uint)y;
}
