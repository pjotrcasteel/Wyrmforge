using Wyrmforge.Application.Runs.Telemetry;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Spells.Synergies;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Application.Runs.Hunts;

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
    public HuntSelection? Hunt { get; init; }
    /// <summary>Falls caught by a reclaimed refuge during this Hunt.</summary>
    public int RefugeReturns { get; init; }
    public IReadOnlyList<HuntMaterialId> SecuredMaterials { get; init; } = [];
    public int Seed { get; init; }
    public int ExperienceEarned { get; init; }
    public int CompletedRouteNodes { get; init; }
    public int RareRouteNodes { get; init; }
    public IReadOnlyList<SynergyId> SynergyIds { get; init; } = Array.Empty<SynergyId>();
    public LaboratoryMutationId? PreparedMutation { get; init; }
    public int ReactionsTriggered { get; init; }
    public IReadOnlyList<DragonId> DragonIds { get; init; } = Array.Empty<DragonId>();
    public IReadOnlyList<DragonId> AscendantDragonIds { get; init; } = Array.Empty<DragonId>();
    public IReadOnlyList<SpellId> WyrmMasteryFeats { get; init; } = Array.Empty<SpellId>();
    public IReadOnlyList<DragonId> DeepEvolvedWyrmDuels { get; init; } = Array.Empty<DragonId>();
    public IReadOnlyList<RunSpellSummary> SpellLoadout { get; init; } = Array.Empty<RunSpellSummary>();
    public IReadOnlyList<RunUpgradeSummary> UpgradeLoadout { get; init; } = Array.Empty<RunUpgradeSummary>();
    public IReadOnlyList<RunRelicSummary> RelicLoadout { get; init; } = Array.Empty<RunRelicSummary>();
    public IReadOnlyList<RunResonanceSummary> Resonance { get; init; } = Array.Empty<RunResonanceSummary>();
    /// <summary>Every creature kind met this hunt, with how many fell (bestiary input).</summary>
    public IReadOnlyList<RunEnemyRecord> EnemyRecords { get; init; } = Array.Empty<RunEnemyRecord>();
    public IReadOnlyList<EliteAffix> ElitesSlain { get; init; } = Array.Empty<EliteAffix>();
    /// <summary>The ultra-rare Reliquary rose and fell this hunt.</summary>
    public bool ReliquarySlain { get; init; }
    /// <summary>Amendment §9 telemetry: what the drafts offered, what was picked and rerolled, per school.</summary>
    public DraftTelemetry Draft { get; init; } = DraftTelemetry.Empty;
    /// <summary>Amendment §9 telemetry: enemy-seconds crowd control denied this hunt.</summary>
    public ControlTelemetry Control { get; init; } = ControlTelemetry.Empty;

    /// <summary>Warding Pulse casts this hunt; each one spent a primary cast.</summary>
    public int ContextualCasts { get; init; }
}

public sealed record RunEnemyRecord(EnemyKind Kind, int Kills);
