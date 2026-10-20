using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Separates living enemies after their individual AI movement. A reusable spatial grid keeps crowded
/// Hunts inexpensive; ordered pair processing and fixed zero-distance normals preserve deterministic replays.
/// </summary>
internal sealed class EnemyCollisionSolver
{
    private const double CellSize = 112;
    private const double Tolerance = 0.0001;
    private const int RelaxationPasses = 4;
    private readonly Dictionary<(int X, int Y), List<int>> cells = [];

    public void Resolve(IReadOnlyList<EnemyState> enemies, ArenaEnvironmentState? environment, double width, double height)
    {
        if (enemies.Count < 2) return;

        var maxRadius = 0d;
        foreach (var enemy in enemies)
            if (enemy.Health > 0) maxRadius = Math.Max(maxRadius, enemy.Radius);
        if (maxRadius <= 0) return;

        for (var pass = 0; pass < RelaxationPasses; pass++)
        {
            foreach (var bucket in cells.Values) bucket.Clear();
            for (var i = 0; i < enemies.Count; i++)
            {
                if (enemies[i].Health <= 0) continue;
                var key = CellOf(enemies[i].Position);
                if (!cells.TryGetValue(key, out var bucket)) cells[key] = bucket = [];
                bucket.Add(i);
            }

            var moved = false;
            for (var i = 0; i < enemies.Count; i++)
            {
                var first = enemies[i];
                if (first.Health <= 0) continue;
                var center = CellOf(first.Position);
                var reach = (int)Math.Ceiling((first.Radius + maxRadius) / CellSize);
                for (var x = center.X - reach; x <= center.X + reach; x++)
                for (var y = center.Y - reach; y <= center.Y + reach; y++)
                {
                    if (!cells.TryGetValue((x, y), out var nearby)) continue;
                    foreach (var index in nearby)
                    {
                        if (index <= i) continue;
                        var second = enemies[index];
                        if (second.Health <= 0) continue;
                        var minDistance = first.Radius + second.Radius;
                        var difference = second.Position - first.Position;
                        var distanceSquared = difference.X * difference.X + difference.Y * difference.Y;
                        if (distanceSquared >= (minDistance - Tolerance) * (minDistance - Tolerance)) continue;
                        if (IsAnchored(first) && IsAnchored(second)) continue;

                        var distance = Math.Sqrt(distanceSquared);
                        // Spawned enemies can share precisely the same pixel. No random numbers or frame-dependent direction.
                        var normal = distance > Tolerance ? difference * (1 / distance)
                            : ((first.Id ^ second.Id) & 1) == 0 ? new Vector2D(1, 0) : new Vector2D(0, 1);
                        var penetration = minDistance - distance;
                        var firstShare = IsAnchored(first) ? 0 : IsAnchored(second) ? penetration : penetration * .5;
                        var secondShare = IsAnchored(second) ? 0 : IsAnchored(first) ? penetration : penetration * .5;
                        var beforeFirst = first.Position;
                        var beforeSecond = second.Position;
                        Move(first, normal * -firstShare, environment, width, height);
                        Move(second, normal * secondShare, environment, width, height);

                        // A wall may pin one member of the pair. Let its neighbour take the remaining displacement.
                        var remaining = minDistance - Vector2D.Distance(first.Position, second.Position);
                        if (remaining > Tolerance)
                        {
                            if (first.Position == beforeFirst && !IsAnchored(second))
                                Move(second, normal * remaining, environment, width, height);
                            else if (second.Position == beforeSecond && !IsAnchored(first))
                                Move(first, normal * -remaining, environment, width, height);
                        }

                        moved |= first.Position != beforeFirst || second.Position != beforeSecond;
                    }
                }
            }
            if (!moved) break;
        }
    }

    private static bool IsAnchored(EnemyState enemy) =>
        enemy.Speed <= 0 || enemy.Statuses.TimeScale(false) <= 0 ||
        enemy.Kind is EnemyKind.ReliquaryWard or EnemyKind.CrystalWard or EnemyKind.Reliquary or EnemyKind.ReliquaryOfGlass
            or EnemyKind.BellWarden or EnemyKind.BellOfWinter;

    private static void Move(EnemyState enemy, Vector2D offset, ArenaEnvironmentState? environment, double width, double height)
    {
        if (offset == Vector2D.Zero || IsAnchored(enemy)) return;
        var previous = enemy.Position;
        var candidate = previous + offset;
        candidate = new Vector2D(
            Math.Clamp(candidate.X, enemy.Radius, Math.Max(enemy.Radius, width - enemy.Radius)),
            Math.Clamp(candidate.Y, enemy.Radius, Math.Max(enemy.Radius, height - enemy.Radius)));
        enemy.Position = environment?.RestrictMovement(previous, candidate, width, height, enemy.Radius) ?? candidate;
    }

    private static (int X, int Y) CellOf(Vector2D position) =>
        ((int)Math.Floor(position.X / CellSize), (int)Math.Floor(position.Y / CellSize));
}
