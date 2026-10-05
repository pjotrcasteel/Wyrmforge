using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed record EnemyCompositionProfile(
    int BaseThreatBudget,
    double SpawnIntervalMultiplier,
    IReadOnlyDictionary<EnemyRole, double> RoleWeights,
    IReadOnlyDictionary<EnemyRole, int>? MinimumRoleCounts = null)
{
    public double WeightFor(EnemyRole role) => RoleWeights.GetValueOrDefault(role);

    public int MinimumFor(EnemyRole role) => MinimumRoleCounts?.GetValueOrDefault(role) ?? 0;
}
