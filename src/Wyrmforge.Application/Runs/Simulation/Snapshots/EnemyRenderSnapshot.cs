using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record EnemyRenderSnapshot(double X, double Y, double Radius, bool Frozen, double HealthRatio, bool HitFlash, IReadOnlyList<CombatStatusRenderSnapshot> Statuses,
    EnemyKind Kind = EnemyKind.Hollow, int EntityId = 0, EnemyTelegraphRenderSnapshot? Telegraph = null)
{
    /// <summary>Ground height under the feet in world units (32 per metre); 0 on flat ground and without terrain.</summary>
    public double Z { get; init; }

    /// <summary>Penitent shield direction in radians while the shield is raised; null when exposed or shieldless.</summary>
    public double? ShieldFacing { get; init; }

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

    /// <summary>0 to 1 while the enemy crawls out of the ground (a field ambush), null otherwise; it cannot act until it reaches 1.</summary>
    public double? EmergeProgress { get; init; }

    /// <summary>Which authored crawl-out clip an emerging enemy plays: 0 the long pull, 1 the short scramble.</summary>
    public int EmergeClip { get; init; }

    /// <summary>A boss mid-transformation: no hit lands until it finishes.</summary>
    public bool Invulnerable { get; init; }

    /// <summary>A boss in the exposed gap after a big commitment (a smash, a rite): the reeling pose.</summary>
    public bool Recovering { get; init; }

    /// <summary>Hoarfrost Cantor frost armour left, as a fraction of a full Rime Hymn crust; 0 when bare.</summary>
    public double RimeArmor { get; init; }
}
