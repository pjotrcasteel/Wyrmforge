using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record EnemyRenderSnapshot(double X, double Y, double Radius, bool Frozen, double HealthRatio, bool HitFlash, IReadOnlyList<CombatStatusRenderSnapshot> Statuses,
    EnemyKind Kind = EnemyKind.Hollow, int EntityId = 0, EnemyTelegraphRenderSnapshot? Telegraph = null)
{
    /// <summary>Penitent shield direction in radians while the shield is raised; null when exposed or shieldless.</summary>
    public double? ShieldFacing { get; init; }

    /// <summary>Actual C# locomotion/attack phase for canine sprites; never inferred from a disappearing telegraph.</summary>
    public string? AnimationPhase { get; init; }

    /// <summary>Locked leap direction on the east/west axis; null for enemies without a canine state.</summary>
    public double? AnimationFacingX { get; init; }

    /// <summary>Fleeing after its priest fell.</summary>
    public bool Routed { get; init; }

    /// <summary>Raised by an Ash Priest; drops no experience.</summary>
    public bool Revived { get; init; }

    /// <summary>Body opacity: a Drowned Wraith rising out of or sinking back into the water. 1 for everything else.</summary>
    public double Opacity { get; init; } = 1;

    /// <summary>Elite affix name (e.g. "Gravebound") for the sprite's visual signature; null for ordinary enemies.</summary>
    public string? Elite { get; init; }

    /// <summary>Standing within a Reliquary ward's reach: faster and harder-hitting.</summary>
    public bool Empowered { get; init; }

    /// <summary>Hoarfrost Cantor frost armour left, as a fraction of a full Rime Hymn crust; 0 when bare.</summary>
    public double RimeArmor { get; init; }
}
