namespace Wyrmforge.Application.Runs.EndRun;

public sealed record RunSummary(
    int Score,
    int Kills,
    int DragonsSlain,
    int DragonEssences,
    int Seconds,
    int Level,
    int Choices,
    int Spells,
    int Synergies,
    int Depth,
    RunOutcome Outcome);
