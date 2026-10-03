using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Application.Runs.EndRun;

public sealed record RunSummary(
    int Score,
    int Kills,
    int DragonsSlain,
    int DragonEssences,
    IReadOnlyList<DragonEssenceId> EssenceIds,
    int Seconds,
    int Level,
    int Choices,
    int Spells,
    int Synergies,
    int Depth,
    RunOutcome Outcome);
