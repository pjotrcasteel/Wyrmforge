namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record RunHudSnapshot(
    int Score,
    int Kills,
    int Seconds,
    double Health,
    double MaxHealth,
    int Level,
    int Experience,
    int ExperienceToNext,
    IReadOnlyList<SpellHudSnapshot> Spells,
    IReadOnlyList<SynergyHudSnapshot> Synergies);
