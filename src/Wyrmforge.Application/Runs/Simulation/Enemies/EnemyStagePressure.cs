namespace Wyrmforge.Application.Runs.Simulation;

public static class EnemyStagePressure
{
    public const double BaseHealth = 60;
    public const double BaseSpeed = 52;

    public static double HealthMultiplier(int stage) => 1 + StageOffset(stage) * 0.12;

    public static double SpeedMultiplier(int stage) => 1 + StageOffset(stage) * 0.10;

    public static double SpawnIntervalSeconds(int stage) => 0.65 - StageOffset(stage) * 0.07;

    private static int StageOffset(int stage) => Math.Clamp(stage, 1, 4) - 1;
}
