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
}
