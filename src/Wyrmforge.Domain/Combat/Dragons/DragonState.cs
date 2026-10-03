using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;

namespace Wyrmforge.Domain.Combat.Dragons;

public sealed class DragonState(int id, DragonDefinition definition, Vector2D position) : ICombatTarget
{
    public int Id { get; } = id;

    public DragonDefinition Definition { get; } = definition;

    public Vector2D Position { get; set; } = position;

    public double Radius => Definition.Radius;

    public double Health { get; set; } = definition.MaxHealth;

    public double MaxHealth => Definition.MaxHealth;

    public double Speed => Definition.Speed;

    public double FrozenFor { get; set; }

    public double AttackCooldown { get; set; } = 2;

    public double TelegraphRemaining { get; set; }

    public Vector2D BreathDirection { get; set; } = new(0, 1);

    public int Phase => Health <= MaxHealth * 0.5 ? 2 : 1;

    public bool IsTelegraphing => TelegraphRemaining > 0;
}
