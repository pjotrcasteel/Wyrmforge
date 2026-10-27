using Wyrmforge.Domain.Combat.Damage;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>A confirmed wound event, not a new hitbox or damage source. Unique IDs prevent repeated decals on each render.</summary>
public sealed record CombatWoundRenderSnapshot(long Id, double X, double Y, double Radius,
    double DirectionX, double DirectionY, double Severity, EnemyKind Kind,
    CombatDamageTraits Traits, bool Killed);
