namespace Wyrmforge.Application.Runs.Depth;

public sealed class RunDepthState
{
    public const int MaxImplementedDepth = 2;

    public int Depth { get; private set; } = 1;

    public bool CanPushDeeper => Depth < MaxImplementedDepth;

    public double EnemyHealthMultiplier => 1 + Math.Max(0, Depth - 1) * 0.35;

    public double EnemySpeedMultiplier => 1 + Math.Max(0, Depth - 1) * 0.15;

    public double SpawnIntervalMultiplier => Math.Pow(0.8, Math.Max(0, Depth - 1));

    public double ScoreMultiplier => 1 + Math.Max(0, Depth - 1) * 0.5;

    public bool PushDeeper()
    {
        if (!CanPushDeeper) return false;
        Depth++;
        return true;
    }
}
