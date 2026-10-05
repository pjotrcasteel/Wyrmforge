using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed record EnemyCompositionPlan(IReadOnlyList<EnemyKind> Enemies, int ThreatSpent);
