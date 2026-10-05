using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Domain.Combat.Targets;

public interface ICombatTarget
{
    int Id { get; }

    Vector2D Position { get; set; }

    double Radius { get; }

    double Health { get; set; }

    double MaxHealth { get; }

    CombatStatusCollection Statuses { get; }
}
