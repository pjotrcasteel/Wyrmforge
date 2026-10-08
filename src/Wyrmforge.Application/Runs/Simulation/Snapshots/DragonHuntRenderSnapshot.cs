using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record DragonHuntRenderSnapshot(
    SpellSchool School,
    DragonHuntStage Stage,
    DragonHuntArenaTrait Arena,
    DragonHuntEntranceStyle Entrance,
    double StageProgress,
    DragonHuntEntranceBeat EntranceBeat,
    double EntranceBeatProgress,
    string SignatureName,
    string PhaseTwoCallout)
{
    public bool IsAscendant { get; init; }
}
