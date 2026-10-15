namespace Wyrmforge.Domain.Spells;

// An earned fourth primary cast; no second base-spell scheduler or extra projectile stream.
public sealed record FocusedSurgeProfile(bool IsSurge, double DamageMultiplier, double RadiusMultiplier, int BonusPierces, int BonusChains, double SplashRadius)
{
    public const int CastInterval = 4;
    public static FocusedSurgeProfile Identity { get; } = new(false, 1, 1, 0, 0, 0);

    public static FocusedSurgeProfile For(int primaryCastCount, int rank)
    {
        if (primaryCastCount <= 0 || primaryCastCount % CastInterval != 0) return Identity;
        return new FocusedSurgeProfile(true, 1.65, 1.2, 1, 2, 32 + 14 * Math.Clamp(rank, 1, 3));
    }
}
