namespace Wyrmforge.Application.Runs.Simulation;

public sealed record EncounterDirective(double SpawnIntervalMultiplier, int BatchSizeBonus, bool SuppressSpawns)
{
    public static EncounterDirective Default { get; } = new(1, 0, false);
}
