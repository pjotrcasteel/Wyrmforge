using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Damage;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record DeathBurstRenderSnapshot(double X, double Y, double Radius, double Progress, int Intensity = 1,
    EnemyKind? Kind = null, int? EntityId = null, double? BodyRadius = null)
{
    public CombatDamageTraits Traits { get; init; }
}
