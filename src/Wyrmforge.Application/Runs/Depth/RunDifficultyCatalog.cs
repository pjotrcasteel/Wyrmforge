namespace Wyrmforge.Application.Runs.Depth;

public static class RunDifficultyCatalog
{
    public static IReadOnlyList<RunDifficultyProfile> All { get; } =
    [
        new(1),
        new(2,
            EnemyHealthMultiplier: 1.35,
            EnemySpeedMultiplier: 1.15,
            SpawnIntervalMultiplier: 0.8,
            ThreatBudgetMultiplier: 1.12,
            ScoreMultiplier: 1.5,
            RouteEnemyHealthBonus: 0.08,
            RouteEnemySpeedBonus: 0.044,
            BaseHazardChance: 0.32,
            DepthTrialEnabled: true),
    ];

    public static int MaximumDepth => All.Max(profile => profile.Depth);

    public static RunDifficultyProfile Get(int depth) => All.SingleOrDefault(profile => profile.Depth == depth)
        ?? throw new ArgumentOutOfRangeException(nameof(depth), depth, "No difficulty profile is registered for this depth.");
}
