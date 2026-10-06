namespace Wyrmforge.Domain.Combat.Statuses;

public static class CombatStatusCatalog
{
    public static IReadOnlyList<CombatStatusDefinition> All { get; } =
    [
        new(CombatStatusId.Frozen, "Frozen", 1, CombatStatusRefreshPolicy.RefreshDuration, TimeScale: 0, BossTimeScale: 0.45, BossDurationMultiplier: 0.35),
        new(CombatStatusId.Burning, "Burning", 5, CombatStatusRefreshPolicy.RefreshDuration, DamagePerSecondPerStack: 2.5),
        new(CombatStatusId.Chilled, "Chilled", 1, CombatStatusRefreshPolicy.RefreshDuration, TimeScale: 0.72, BossTimeScale: 0.88, BossDurationMultiplier: 0.6),
        new(CombatStatusId.Shocked, "Shocked", 3, CombatStatusRefreshPolicy.RefreshDuration, DamageTakenMultiplierPerStack: 1.08),
        new(CombatStatusId.ArcaneMark, "Arcane Mark", 4, CombatStatusRefreshPolicy.RefreshDuration, DamageTakenMultiplierPerStack: 1.06),
    ];

    public static CombatStatusDefinition Get(CombatStatusId id) => All.Single(status => status.Id == id);
}
