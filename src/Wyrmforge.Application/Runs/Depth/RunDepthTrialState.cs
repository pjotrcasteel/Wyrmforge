namespace Wyrmforge.Application.Runs.Depth;

public sealed class RunDepthTrialState
{
    public const int KillsRequired = 12;
    public const int ScoreReward = 750;

    public bool IsActive { get; private set; }

    public int Kills { get; private set; }

    public void Start(int depth)
    {
        Kills = 0;
        IsActive = depth >= 2;
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
