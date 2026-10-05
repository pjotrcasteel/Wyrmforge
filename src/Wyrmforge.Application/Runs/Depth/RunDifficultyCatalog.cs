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
            ScoreMultiplier: 1.5,
            RouteEnemyHealthBonus: 0.08,
            RouteEnemySpeedBonus: 0.044,
            BaseHazardChance: 0.32,
            TrialKillsRequired: 12,
            TrialScoreReward: 750),
        new(3,
            EnemyHealthMultiplier: 1.75,
            EnemySpeedMultiplier: 1.28,
            SpawnIntervalMultiplier: 0.68,
            ThreatBudgetMultiplier: 1.2,
            ScoreMultiplier: 2.1,
            RouteEnemyHealthBonus: 0.16,
            RouteEnemySpeedBonus: 0.088,
            BaseHazardChance: 0.44,
            HazardIntervalMultiplier: 0.9,
            DragonHealthMultiplier: 1.25,
            DragonDamageMultiplier: 1.12,
            TrialKillsRequired: 14,
            TrialScoreReward: 1100),
        new(4,
            EnemyHealthMultiplier: 2.2,
            EnemySpeedMultiplier: 1.4,
            SpawnIntervalMultiplier: 0.58,
            ThreatBudgetMultiplier: 1.35,
            ScoreMultiplier: 2.8,
            RouteEnemyHealthBonus: 0.24,
            RouteEnemySpeedBonus: 0.132,
            BaseHazardChance: 0.56,
            HazardIntervalMultiplier: 0.8,
            DragonHealthMultiplier: 1.55,
            DragonDamageMultiplier: 1.25,
            TrialKillsRequired: 16,
            TrialScoreReward: 1600),
    ];

    public static int MaximumDepth => All[^1].Depth;

    public static RunDifficultyProfile Get(int depth) => All.SingleOrDefault(profile => profile.Depth == depth)
        ?? throw new ArgumentOutOfRangeException(nameof(depth), depth, "No difficulty profile is registered for this depth.");
}
