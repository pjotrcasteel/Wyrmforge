namespace Wyrmforge.Domain.Combat.Enemies;

public sealed record EnemyDefinition(
    EnemyKind Kind,
    EnemyRole Role,
    int ThreatCost,
    double Radius,
    int MinimumDepth = 1,
    double HealthMultiplier = 1,
    double SpeedMultiplier = 1,
    double ContactDamageMultiplier = 1);
