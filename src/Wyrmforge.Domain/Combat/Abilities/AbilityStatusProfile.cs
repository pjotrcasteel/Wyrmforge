using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Domain.Combat.Abilities;

public sealed record AbilityStatusProfile(CombatStatusId Status, double BaseDurationSeconds, double DurationIncreasePerRank = 0, int Stacks = 1)
{
    public double CalculateDurationSeconds(int rank) => BaseDurationSeconds + Math.Max(0, rank - 1) * DurationIncreasePerRank;
}
