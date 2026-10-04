namespace Wyrmforge.Domain.Combat.Dragons;

public sealed record DragonCombatProfile(
    DragonMovementProfile Movement,
    DragonAttackProfile Attack,
    double ContactDamagePerSecond,
    DragonRewardProfile Reward);
