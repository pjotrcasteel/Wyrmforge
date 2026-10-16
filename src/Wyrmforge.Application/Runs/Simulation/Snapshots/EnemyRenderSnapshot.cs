using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record EnemyRenderSnapshot(double X, double Y, double Radius, bool Frozen, double HealthRatio, bool HitFlash, IReadOnlyList<CombatStatusRenderSnapshot> Statuses,
    EnemyKind Kind = EnemyKind.Hollow, int EntityId = 0, EnemyTelegraphRenderSnapshot? Telegraph = null)
{
    /// <summary>Penitent shield direction in radians while the shield is raised; null when exposed or shieldless.</summary>
    public double? ShieldFacing { get; init; }

    /// <summary>Fleeing after its priest fell.</summary>
    public bool Routed { get; init; }

    /// <summary>Raised by an Ash Priest; drops no experience.</summary>
    public bool Revived { get; init; }

    /// <summary>Body opacity: a Drowned Wraith rising out of or sinking back into the water. 1 for everything else.</summary>
    public double Opacity { get; init; } = 1;
}
