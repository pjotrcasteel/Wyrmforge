namespace Wyrmforge.Application.Runs.Extraction;

// Wyrm victory produces a curated ritual defense, not a return to endless ambient spawning.
public static class ExtractionDefenseProfile
{
    public const double OpeningGraceSeconds = 1.6;
    public const double FinalNoNewWavesSeconds = 2.0;

    public static int ActiveEnemyCap(int depth) => Math.Min(8, 3 + Math.Max(1, depth));

    public static double SpawnIntervalSeconds(int depth) => Math.Max(1.4, 2.35 - (Math.Max(1, depth) - 1) * 0.2);

    public static bool CanSpawn(double remainingSeconds) => remainingSeconds > FinalNoNewWavesSeconds;
}
