namespace Wyrmforge.Domain.Spells;

public static class FrostShardMastery
{
    public const int RequiredRank = 3;
    public const double NovaRadius = 82;
    public const double NovaFreezeSeconds = 0.45;

    public static bool IsActive(int rank) => rank >= RequiredRank;
}
