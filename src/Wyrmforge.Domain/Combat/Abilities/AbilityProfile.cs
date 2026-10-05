namespace Wyrmforge.Domain.Combat.Abilities;

public sealed record AbilityProfile(double BaseCooldownSeconds, double CooldownReductionPerRank, double BaseDamage, double DamageIncreasePerRank,
    AbilityDeliveryProfile Delivery, AbilityStatusProfile? Status = null)
{
    public double CalculateCooldownSeconds(int rank)
    {
        var rankIndex = Math.Max(0, rank - 1);
        return BaseCooldownSeconds * (1 - rankIndex * CooldownReductionPerRank);
    }

    public double CalculateDamage(int rank)
    {
        var rankIndex = Math.Max(0, rank - 1);
        return BaseDamage * (1 + rankIndex * DamageIncreasePerRank);
    }
}
