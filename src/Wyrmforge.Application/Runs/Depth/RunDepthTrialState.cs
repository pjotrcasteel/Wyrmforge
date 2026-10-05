namespace Wyrmforge.Application.Runs.Depth;

public sealed class RunDepthTrialState
{
    public bool IsActive { get; private set; }
    public int Kills { get; private set; }
    public int KillsRequired { get; private set; }
    public int ScoreReward { get; private set; }

    public void Start(RunDifficultyProfile difficulty)
    {
        Kills = 0;
        KillsRequired = difficulty.TrialKillsRequired;
        ScoreReward = difficulty.TrialScoreReward;
        IsActive = difficulty.DepthTrialEnabled;
    }

    public bool RegisterKill()
    {
        if (!IsActive) return false;
        Kills++;
        if (Kills < KillsRequired) return false;
        IsActive = false;
        return true;
    }
}
