namespace Wyrmforge.Domain.Combat.Projectiles;

public readonly record struct ProjectileEffects(bool Inferno, int ChainsLeft, double SplashRadius, double FreezeDuration, int Pierces);
