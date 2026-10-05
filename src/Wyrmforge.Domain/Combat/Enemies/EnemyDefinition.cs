namespace Wyrmforge.Domain.Combat.Enemies;

public sealed record EnemyDefinition(EnemyKind Kind, EnemyRole Role, int ThreatCost, double Radius, int MinimumDepth = 1);
