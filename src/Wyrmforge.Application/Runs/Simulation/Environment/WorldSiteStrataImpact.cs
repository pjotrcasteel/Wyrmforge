using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// One explicit C# area-damage instruction in integer XY cells. The caller owns
/// the impact identity, peak strength and material durability. Radius is counted
/// in cells, not unapproved physical metres or a guessed 32m voxel size.
/// </summary>
public sealed record WorldSiteStrataImpact(
    string ImpactId,
    int CenterX,
    int CenterY,
    int RadiusCells,
    int PeakDamage,
    int SoilIntegrity,
    int RockIntegrity,
    int OtherIntegrity);

/// <summary>
/// A single changed C# physical cell and its freshly exposed top face. This is
/// presentation/FX evidence, never a second damage/collision decision.
/// </summary>
public sealed record WorldSiteStrataImpactChange(
    WorldSiteCellKey Key,
    int AppliedDamage,
    WorldSiteSurfaceId? SurfaceBefore,
    WorldSiteCellDelta Delta,
    WorldSiteCellKey ExposedKey,
    WorldSiteSurfaceId? ExposedMaterial);

/// <summary>
/// Deterministic one-impact mutation event for a future existing gameplay/FXP/G
/// adapter. No effects are emitted or simulated by the matrix prototype itself.
/// </summary>
public sealed record WorldSiteStrataImpactResult(
    string ImpactId,
    int CenterX,
    int CenterY,
    int RadiusCells,
    long RevisionBefore,
    long RevisionAfter,
    IReadOnlyList<WorldSiteStrataImpactChange> Changes)
{
    public const int CurrentVersion = 1;

    /// <summary>Versioned event contract for a future existing C# gameplay/FX adapter.</summary>
    public int Version { get; init; } = CurrentVersion;
}
