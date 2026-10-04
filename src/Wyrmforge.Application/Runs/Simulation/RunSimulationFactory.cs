using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class RunSimulationFactory(LevelChoiceService levelChoiceService, IRandomSource randomSource)
{
    public RunSimulation Create(IReadOnlySet<string> selectedNodes, DragonEssenceId? offering = null, DragonId huntTarget = DragonId.Ashfang)
    {
        var simulation = new RunSimulation(selectedNodes, levelChoiceService, randomSource, offering, huntTarget);
        simulation.InitializeResonance(selectedNodes);
        return simulation;
    }
}
