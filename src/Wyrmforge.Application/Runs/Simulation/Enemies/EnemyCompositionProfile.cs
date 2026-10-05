using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed record EnemyCompositionProfile(double SpawnIntervalMultiplier, IReadOnlyDictionary<EnemyRole, double> RoleWeights);
