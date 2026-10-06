using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class RunSimulationFactory(IRandomSource seedSource)
{
    public RunSimulation Create(IReadOnlySet<string> selectedNodes, DragonEssenceId? offering = null, int? seed = null)
    {
        var runSeed = seed ?? seedSource.Next(int.MaxValue);
        var randomSource = new SeededRandomSource(runSeed);
        var levelChoiceService = new LevelChoiceService(randomSource);
        var simulation = new RunSimulation(selectedNodes, levelChoiceService, randomSource, offering);
        simulation.InitializeRunSeed(runSeed);
        simulation.InitializeResonance(selectedNodes);
        return simulation;
    }
}
