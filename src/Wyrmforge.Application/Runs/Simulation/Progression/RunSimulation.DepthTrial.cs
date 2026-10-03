using Wyrmforge.Application.Runs.Depth;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private void RegisterDepthTrialKill()
    {
        if (!depthTrialState.RegisterKill()) return;
        score += RunDepthTrialState.ScoreReward;
        deepDragonPending = true;
    }
}
