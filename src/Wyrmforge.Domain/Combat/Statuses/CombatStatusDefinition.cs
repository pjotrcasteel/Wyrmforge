namespace Wyrmforge.Domain.Combat.Statuses;

public sealed record CombatStatusDefinition(CombatStatusId Id, string Name, int MaxStacks, CombatStatusRefreshPolicy RefreshPolicy,
    double TimeScale = 1, double BossTimeScale = 1, double BossDurationMultiplier = 1);
