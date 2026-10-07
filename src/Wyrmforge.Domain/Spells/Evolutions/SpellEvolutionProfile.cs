namespace Wyrmforge.Domain.Spells.Evolutions;

public sealed record SpellEvolutionProfile(
    double DamageMultiplier = 1,
    double CastIntervalMultiplier = 1,
    double ProjectileSpeedMultiplier = 1,
    double ProjectileRadiusMultiplier = 1,
    int ExtraProjectiles = 0,
    int BonusPierces = 0,
    int BonusChains = 0,
    double SplashRadius = 0,
    double FrostNovaRadius = 0,
    double StatusDurationMultiplier = 1,
    int BonusStatusStacks = 0,
    double ChainFalloffMultiplier = 1)
{
    public static SpellEvolutionProfile Identity { get; } = new();
}
