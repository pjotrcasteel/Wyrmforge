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

    /// <summary>
    /// Concurrent committed threats (hound pounces, slinger swings and embers in flight). The brief caps the opening at
    /// about two so a telegraph is always readable; later trails allow one more per pressure stage.
    /// </summary>
    public static int CommittedThreatCap(int stage) => WyrmrealmStageCatalog.PressureStage(stage) switch { <= 2 => 2, 3 => 3, _ => 4 };

    /// <summary>No ranged harassment until the hunter has had this long to read the field (brief §5).</summary>
    public const double RangedGraceSeconds = 10;

    /// <summary>Minimum gap between two slingers starting a swing, so shots arrive staggered rather than as a volley.</summary>
    public const double RangedStaggerSeconds = 0.9;

    private static int StageOffset(int stage) => WyrmrealmStageCatalog.PressureStage(stage) - 1;
}
