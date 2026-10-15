using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Domain.Combat.Projectiles;

public readonly record struct ProjectileEffects(bool Inferno, int ChainsLeft, double SplashRadius, ProjectileStatusEffect? Status, int Pierces, double FrostNovaRadius)
{
    public SynergyId? Combination { get; init; }
    public int Rank { get; init; } = 1;
    public bool Surge { get; init; }
    public IReadOnlyList<ProjectileStatusEffect> AdditionalStatuses { get; init; } = [];
}
