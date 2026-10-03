using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;

namespace Wyrmforge.Domain.Combat.Enemies;

public sealed class EnemyState(int id, Vector2D position, double radius, double health, double speed) : ICombatTarget
{
    public int Id { get; } = id;

    public Vector2D Position { get; set; } = position;

    public double Radius { get; } = radius;

    public double Health { get; set; } = health;

    public double MaxHealth { get; } = health;

    public double Speed { get; } = speed;

    public double FrozenFor { get; set; }
}
