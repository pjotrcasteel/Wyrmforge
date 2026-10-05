namespace Wyrmforge.Domain.Combat.Abilities;

public sealed record ChainAbilityProfile(int BaseJumpsAtRankOne, int JumpsPerRank, double DamageFalloff) : AbilityDeliveryProfile
{
    public int CalculateJumps(int rank) => BaseJumpsAtRankOne + Math.Max(0, rank - 1) * JumpsPerRank;
}
