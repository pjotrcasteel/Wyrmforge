using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record EnemyRenderSnapshot(double X, double Y, double Radius, bool Frozen, double HealthRatio, bool HitFlash, IReadOnlyList<CombatStatusRenderSnapshot> Statuses,
    EnemyKind Kind = EnemyKind.Chaser);
