namespace Wyrmforge.Application.Runs.Navigation;

public sealed record WyrmrealmEncounterProfile(
    WyrmrealmEncounterKind Kind,
    double SpawnIntervalMultiplier = 1,
    double EnemyHealthMultiplier = 1,
    double EnemySpeedMultiplier = 1);
