namespace Wyrmforge.Domain.Combat.Statuses;

public sealed record CombatStatusDefinition(CombatStatusId Id, string Name, int MaxStacks, CombatStatusRefreshPolicy RefreshPolicy, bool IsImmobilizing = false,
    double BossDurationMultiplier = 1);
