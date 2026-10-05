namespace Wyrmforge.Domain.Combat.Projectiles;

public readonly record struct ProjectileEffects(bool Inferno, int ChainsLeft, double SplashRadius, ProjectileStatusEffect? Status, int Pierces, double FrostNovaRadius);
