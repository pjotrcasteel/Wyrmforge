using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Combat.Targets;

namespace Wyrmforge.Domain.Combat.Dragons;

public sealed class DragonState : ICombatTarget
{
    public DragonState(int id, DragonDefinition definition, Vector2D position, double healthMultiplier = 1)
    {
        Id = id;
        Definition = definition;
        Position = position;
        MaxHealth = definition.MaxHealth * healthMultiplier;
        Health = MaxHealth;
    }

    public int Id { get; }
    public DragonDefinition Definition { get; }
    public Vector2D Position { get; set; }
    public double Radius => Definition.Radius;
    public double Health { get; set; }
    public double MaxHealth { get; }
    public double Speed => Definition.Speed;
    public CombatStatusCollection Statuses { get; } = new();
    public double AttackCooldown { get; set; } = 2;
    public double TelegraphRemaining { get; set; }
    public Vector2D BreathDirection { get; set; } = new(0, 1);
    public Vector2D AttackTarget { get; set; } = Vector2D.Zero;
    public int Phase => Health <= MaxHealth * 0.5 ? 2 : 1;
    public bool IsTelegraphing => TelegraphRemaining > 0;
}
