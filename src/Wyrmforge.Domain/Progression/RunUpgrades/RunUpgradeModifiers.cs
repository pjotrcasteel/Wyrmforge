namespace Wyrmforge.Domain.Progression.RunUpgrades;

public sealed record RunUpgradeModifiers(
    double DamageMultiplier,
    double CastIntervalMultiplier,
    double ProjectileSpeedMultiplier,
    double MoveSpeedMultiplier,
    double MaxHealthBonus,
    int ExtraProjectiles,
    int BonusChains,
    int FreezeEveryHits,
    double FreezeDuration,
    int EchoEveryCasts,
    double EchoDamageMultiplier)
{
    public static RunUpgradeModifiers Create(RunUpgradeState state)
    {
        var multicastRank = state[RunUpgradeId.Multicast];
        var frostRank = state[RunUpgradeId.FrostTouch];
        var echoRank = state[RunUpgradeId.ArcaneEcho];
        return new RunUpgradeModifiers(
            (1 + state[RunUpgradeId.Potency] * 0.18) * Math.Pow(0.9, multicastRank),
            1 / (1 + state[RunUpgradeId.Quickening] * 0.12),
            1,
            1 + state[RunUpgradeId.Fleetfoot] * 0.1,
            state[RunUpgradeId.Vitality] * 18,
            multicastRank,
            state[RunUpgradeId.ChainSpark],
            frostRank == 0 ? 0 : 7 - frostRank,
            frostRank == 0 ? 0 : 0.65 + frostRank * 0.2,
            echoRank == 0 ? 0 : echoRank == 1 ? 7 : 5,
            echoRank == 0 ? 0 : echoRank == 1 ? 0.55 : 0.8);
    }
}
