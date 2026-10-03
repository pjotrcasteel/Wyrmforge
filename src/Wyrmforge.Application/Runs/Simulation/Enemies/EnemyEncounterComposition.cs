using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

public static class EnemyEncounterComposition
{
    public const int SpawnsPerPattern = 6;

    public static EnemyKind GetEnemyKind(EnemyEncounterPattern pattern, int spawnIndex) => pattern switch
    {
        EnemyEncounterPattern.Swarm => EnemyKind.Chaser,
        EnemyEncounterPattern.StalkerPressure => spawnIndex % 2 == 0 ? EnemyKind.RiftStalker : EnemyKind.Chaser,
        _ => spawnIndex is 2 or 5 ? EnemyKind.RiftStalker : EnemyKind.Chaser,
    };

    public static double GetSpawnIntervalMultiplier(EnemyEncounterPattern pattern) => pattern switch
    {
        EnemyEncounterPattern.Swarm => 0.55,
        EnemyEncounterPattern.StalkerPressure => 0.9,
        _ => 0.75,
    };

    public static EnemyEncounterPattern SelectNext(EnemyEncounterPattern previous, int alternativeIndex)
    {
        if (alternativeIndex is < 0 or > 1) throw new ArgumentOutOfRangeException(nameof(alternativeIndex));
        return (EnemyEncounterPattern)(((int)previous + 1 + alternativeIndex) % 3);
    }
}
