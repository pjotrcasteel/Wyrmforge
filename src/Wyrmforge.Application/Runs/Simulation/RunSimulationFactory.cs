using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class RunSimulationFactory(LevelChoiceService levelChoiceService, IRandomSource randomSource)
{
    public RunSimulation Create(IReadOnlySet<string> selectedNodes) => new(selectedNodes, levelChoiceService, randomSource);
}
