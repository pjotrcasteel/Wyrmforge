namespace Wyrmforge.Domain.Spells;

public static class ChainLightningMastery
{
    public const int RequiredRank = 3;
    public const double ForkDamageMultiplier = 0.65;

    public static bool IsActive(int rank) => rank >= RequiredRank;

    public static double CalculateForkDamage(double damage) => damage * ForkDamageMultiplier;
}
