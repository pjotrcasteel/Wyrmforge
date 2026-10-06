using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Progression;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Forge;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class RunSimulationFactory(IRandomSource seedSource)
{
    public RunSimulation Create(IReadOnlySet<string> selectedNodes, DragonEssenceId? offering = null, int? seed = null, ForgeProgressionState? progression = null)
    {
        var runSeed = seed ?? seedSource.Next(int.MaxValue);
        var randomSource = new SeededRandomSource(runSeed);
        var content = progression is null ? RunContentProfile.All : RunContentProfile.From(progression);
        var levelChoiceService = new LevelChoiceService(randomSource, content.Spells);
        var simulation = new RunSimulation(selectedNodes, levelChoiceService, randomSource, offering);
        simulation.InitializeRunSeed(runSeed);
        simulation.InitializeContentProfile(content);
        simulation.InitializeResonance(selectedNodes);
        return simulation;
    }
}
