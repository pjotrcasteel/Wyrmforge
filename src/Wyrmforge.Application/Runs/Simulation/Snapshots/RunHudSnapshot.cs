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
    IReadOnlyList<SynergyHudSnapshot> Synergies)
{
    /// <summary>Seconds until the committed primary may cast again. Never inferred by the browser.</summary>
    public double PrimaryCooldownRemaining { get; init; }

    /// <summary>The actual primary cast interval used for the current cooldown.</summary>
    public double PrimaryCooldownDuration { get; init; }

    /// <summary>Seconds remaining for the prepared automatic defensive spell, if any.</summary>
    public double DefensiveCooldownRemaining { get; init; }

    /// <summary>Recovery interval of the prepared defensive spell; zero means unavailable.</summary>
    public double DefensiveCooldownDuration { get; init; }
}
