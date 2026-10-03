using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Targets;

public interface ICombatTarget
{
    int Id { get; }

    Vector2D Position { get; set; }

    double Radius { get; }

    double Health { get; set; }

    double MaxHealth { get; }

    double FrozenFor { get; set; }
}
