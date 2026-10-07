using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;

namespace Wyrmforge.Application.Runs.SelfPlay;

public sealed record RunAgentObservation(
    RunRenderSnapshot Snapshot,
    IReadOnlyList<WyrmrealmMapNode> AvailableMapNodes,
    IReadOnlyList<LevelChoice> LevelChoices,
    IReadOnlyList<RelicDefinition> RelicChoices,
    IReadOnlyList<DragonEssenceDefinition> EssenceChoices,
    IReadOnlyList<RunCheckpointActionState> CheckpointActions,
    int Depth,
    int SecuredEssenceCount,
    bool CanPushDeeper)
{
    public double HealthRatio => Snapshot.Player is { } player && Snapshot.Hud.MaxHealth > 0 ? Snapshot.Hud.Health / Snapshot.Hud.MaxHealth : 0;
}
