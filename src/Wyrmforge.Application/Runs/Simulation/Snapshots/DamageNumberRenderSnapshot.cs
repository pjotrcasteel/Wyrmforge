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
    bool Periodic);
