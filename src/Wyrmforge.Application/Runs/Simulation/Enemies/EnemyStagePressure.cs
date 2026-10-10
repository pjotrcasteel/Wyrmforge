using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Runs.Simulation;

public static class EnemyStagePressure
{
    public const double BaseHealth = 60;
    public const double BaseSpeed = 52;

    public static double HealthMultiplier(int stage) => 1 + StageOffset(stage) * 0.12;

    public static double SpeedMultiplier(int stage) => 1 + StageOffset(stage) * 0.10;

    public static double SpawnIntervalSeconds(int stage) => 0.65 - StageOffset(stage) * 0.07;

    public static int ActiveEnemyCap(int stage, int depth) => depth == 1
        ? WyrmrealmStageCatalog.PressureStage(stage) switch { 1 => 8, 2 => 10, 3 => 14, _ => 22 }
        : EnemyEncounterComposition.GetActiveEnemyCap(depth);

    public static double OpeningSpawnIntervalMultiplier(int stage, int depth) => depth == 1
        ? WyrmrealmStageCatalog.PressureStage(stage) switch { 1 => 1.75, 2 => 1.60, 3 => 1.30, _ => 1 }
        : 1;

    private static int StageOffset(int stage) => WyrmrealmStageCatalog.PressureStage(stage) - 1;
}
