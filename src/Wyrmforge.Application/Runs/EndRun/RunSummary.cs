using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Spells.Synergies;

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
    RunOutcome Outcome)
{
    public int Seed { get; init; }
    public int CompletedRouteNodes { get; init; }
    public int RareRouteNodes { get; init; }
    public IReadOnlyList<SynergyId> SynergyIds { get; init; } = Array.Empty<SynergyId>();
    public IReadOnlyList<DragonId> DragonIds { get; init; } = Array.Empty<DragonId>();
    public IReadOnlyList<RunSpellSummary> SpellLoadout { get; init; } = Array.Empty<RunSpellSummary>();
    public IReadOnlyList<RunUpgradeSummary> UpgradeLoadout { get; init; } = Array.Empty<RunUpgradeSummary>();
    public IReadOnlyList<RunRelicSummary> RelicLoadout { get; init; } = Array.Empty<RunRelicSummary>();
    public IReadOnlyList<RunResonanceSummary> Resonance { get; init; } = Array.Empty<RunResonanceSummary>();
}
