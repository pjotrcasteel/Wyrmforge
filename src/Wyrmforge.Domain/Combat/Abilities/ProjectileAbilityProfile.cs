namespace Wyrmforge.Domain.Combat.Abilities;

public sealed record ProjectileAbilityProfile(double BaseSpeed, double SpeedPerRank, double Radius) : AbilityDeliveryProfile
{
    public double CalculateSpeed(int rank) => BaseSpeed + Math.Max(0, rank - 1) * SpeedPerRank;
}
