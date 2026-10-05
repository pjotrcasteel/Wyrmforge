namespace Wyrmforge.Domain.Combat.Statuses;

public static class CombatStatusCatalog
{
    public static IReadOnlyList<CombatStatusDefinition> All { get; } =
    [
        new(CombatStatusId.Frozen, "Frozen", 1, CombatStatusRefreshPolicy.RefreshDuration, IsImmobilizing: true, BossDurationMultiplier: 0.35),
    ];

    public static CombatStatusDefinition Get(CombatStatusId id) => All.Single(status => status.Id == id);
}
