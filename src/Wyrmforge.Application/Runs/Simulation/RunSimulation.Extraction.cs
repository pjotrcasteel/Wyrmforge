using Wyrmforge.Application.Runs.Depth;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    public int SecuredEssenceCount => essenceCargoState.SecuredCount;

    public double NextDepthScoreMultiplier => depthState.CanPushDeeper
        ? RunDifficultyCatalog.Get(depthState.Depth + 1).ScoreMultiplier
        : depthState.ScoreMultiplier;
}
