namespace Wyrmforge.Application.Runs.Depth;

public sealed record RunDifficultyProfile(
    int Depth,
    double EnemyHealthMultiplier = 1,
    double EnemySpeedMultiplier = 1,
    double SpawnIntervalMultiplier = 1,
    double ThreatBudgetMultiplier = 1,
    double ScoreMultiplier = 1,
    double RouteEnemyHealthBonus = 0,
    double RouteEnemySpeedBonus = 0,
    double BaseHazardChance = 0.2,
    double HazardIntervalMultiplier = 1,
    double DragonHealthMultiplier = 1,
    double DragonDamageMultiplier = 1,
    int TrialKillsRequired = 0,
    int TrialScoreReward = 0)
{
    public bool DepthTrialEnabled => TrialKillsRequired > 0;
}
