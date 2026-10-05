namespace Wyrmforge.Application.Runs.Depth;

public sealed class RunDepthState
{
    public int Depth { get; private set; } = 1;

    public static int MaxImplementedDepth => RunDifficultyCatalog.MaximumDepth;
    public bool CanPushDeeper => Depth < MaxImplementedDepth;
    public RunDifficultyProfile Difficulty => RunDifficultyCatalog.Get(Depth);
    public double EnemyHealthMultiplier => Difficulty.EnemyHealthMultiplier;
    public double EnemySpeedMultiplier => Difficulty.EnemySpeedMultiplier;
    public double SpawnIntervalMultiplier => Difficulty.SpawnIntervalMultiplier;
    public double ThreatBudgetMultiplier => Difficulty.ThreatBudgetMultiplier;
    public double ScoreMultiplier => Difficulty.ScoreMultiplier;
    public double HazardIntervalMultiplier => Difficulty.HazardIntervalMultiplier;
    public double DragonHealthMultiplier => Difficulty.DragonHealthMultiplier;
    public double DragonDamageMultiplier => Difficulty.DragonDamageMultiplier;

    public bool PushDeeper()
    {
        if (!CanPushDeeper) return false;
        Depth++;
        return true;
    }
}
