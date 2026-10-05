namespace Wyrmforge.Application.Runs.Navigation;

public sealed record WyrmrealmRouteTuning(
    double RecoveryFraction = 0,
    double SpawnIntervalMultiplier = 1,
    double EnemyHealthMultiplier = 1,
    double EnemySpeedMultiplier = 1,
    IReadOnlyList<WyrmrealmEncounterModifier>? Modifiers = null,
    WyrmrealmRelicRewardProfile? Relic = null);
