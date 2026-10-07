using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;

namespace Wyrmforge.Application.Runs.SelfPlay;

public interface IRunAgent
{
    string Name { get; }
    MovementInput ChooseMovement(RunAgentObservation observation);
    string ChooseMapNode(RunAgentObservation observation);
    LevelChoice ChooseLevelChoice(RunAgentObservation observation);
    RelicId ChooseRelic(RunAgentObservation observation);
    DragonEssenceId ChooseEssence(RunAgentObservation observation);
    RunCheckpointActionId ChooseCheckpointAction(RunAgentObservation observation);
}
