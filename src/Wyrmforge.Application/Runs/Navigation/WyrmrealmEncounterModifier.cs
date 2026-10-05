namespace Wyrmforge.Application.Runs.Navigation;

public sealed record WyrmrealmEncounterModifier(
    string Id,
    double SpawnIntervalMultiplier = 1,
    double EnemyHealthMultiplier = 1,
    double EnemySpeedMultiplier = 1,
    double ThreatBudgetMultiplier = 1,
    double RecoveryMultiplier = 1,
    WyrmrealmHazardKind? HazardKind = null,
    double HazardIntervalMultiplier = 1);
