using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>One pack's spawn order. <see cref="Recipe"/> is the structured group it was built around, if any.</summary>
public sealed record EnemyCompositionPlan(IReadOnlyList<EnemyKind> Enemies, int ThreatSpent, EnemyPackRecipe? Recipe = null);
