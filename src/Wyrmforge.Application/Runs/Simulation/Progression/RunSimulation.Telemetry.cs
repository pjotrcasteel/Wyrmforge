using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Telemetry;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly DraftLedger draftLedger = new();
    private readonly ControlLedger controlLedger = new();

    public DraftTelemetry DraftTelemetry => draftLedger.Snapshot(fateweave);

    public ControlTelemetry ControlTelemetry => controlLedger.Snapshot();

    private SpellSchool PrimarySchool => SpellCatalog.Get(build.Spells.ActiveSpell).School;

    private void RecordDraftOpened() =>
        draftLedger.Open(pendingChoices, PrimarySchool, !PendingRewardSchool.HasValue && PowerMilestoneProfile.IsMajorLevel(level + 1));

    private void RecordReroll(LevelChoice replaced, LevelChoice replacement) => draftLedger.Reroll(replaced, replacement, PrimarySchool);

    private void RecordSelection(LevelChoice choice) => draftLedger.Select(choice, PrimarySchool);

    private void RecordEnemyControl(EnemyState enemy, double delta, double timeScale) =>
        controlLedger.ObserveEnemy(delta, timeScale, (enemy.Position - player.Position).Length, enemy.IsElite || enemy.Kind is EnemyKind.Reliquary or EnemyKind.BellWarden or EnemyKind.BellOfWinter);

    private void RecordUpgradePulse(double seconds) => controlLedger.BeginPulse(seconds);

    private void AdvanceControlTelemetry(double delta) => controlLedger.Advance(delta);

    private void RecordWyrmControl(double delta, double timeScale) => controlLedger.ObserveWyrm(delta, timeScale);

    private void RecordControlledKill(ICombatTarget target)
    {
        if (target is not EnemyState) return;
        controlLedger.Kill(target.Statuses.Has(CombatStatusId.Frozen) || target.Statuses.Has(CombatStatusId.Chilled));
    }
}