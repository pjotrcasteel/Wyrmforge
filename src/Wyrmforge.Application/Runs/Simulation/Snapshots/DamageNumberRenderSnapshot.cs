namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>
/// Presentation-only record of damage actually removed from a combat target.
/// Number sequences and positions are deterministic; combat rules never read this record.
/// </summary>
public sealed record DamageNumberRenderSnapshot(
    long Sequence,
    double X,
    double Y,
    double Amount,
    string School,
    double Progress,
    bool Finisher,
    bool Empowered,
    bool Periodic)
{
    /// <summary>Authoritative damage classification; a cosmetic renderer may style it but never decide it.</summary>
    public string Flavor { get; init; } = "Impact";

    /// <summary>True when a hit removes a substantial portion of the target's maximum health.</summary>
    public bool Heavy { get; init; }

    /// <summary>Exact authoritative target identity; used by cosmetic hit effects without guessing from coordinates.</summary>
    public int TargetId { get; init; }

    /// <summary>Distinguishes dragon IDs from ordinary enemy IDs in presentation adapters.</summary>
    public bool IsDragon { get; init; }
}
