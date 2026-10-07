namespace Wyrmforge.Domain.Combat.Stats;

public sealed record PassiveDetonationEffect(double DamageMultiplier, double Radius);

public static class PassiveEffectResolver
{
    public const int DetonationHitInterval = 4;
    public const double DetonationRadius = 58;
    public const double VolcanicDetonationRadius = 94;
    public const double DetonationDamageMultiplier = 2;
    public const double VolcanicDetonationDamageMultiplier = 2.5;

    public const int ArcaneEchoCastInterval = 4;
    public const double ArcaneEchoDamageMultiplier = 0.60;

    public const int DeepFreezeHitInterval = 3;
    public const double DeepFreezeDurationSeconds = 1.75;
    public const double AbsoluteZeroDamageMultiplier = 2.5;

    public const double IceArmorDamageTakenMultiplier = 0.60;
    public const double IceArmorDurationSeconds = 1.35;
    public const double WinterShellRechargeSeconds = 5;
    public const double WinterShellGuardSeconds = 0.65;

    public static PassiveDetonationEffect? ResolveDetonation(PassiveCombatProfile profile, int hitCount)
    {
        ArgumentNullException.ThrowIfNull(profile);
        if (!profile.Detonation || hitCount <= 0 || hitCount % DetonationHitInterval != 0) return null;

        return profile.Volcanic
            ? new PassiveDetonationEffect(VolcanicDetonationDamageMultiplier, VolcanicDetonationRadius)
            : new PassiveDetonationEffect(DetonationDamageMultiplier, DetonationRadius);
    }

    public static IReadOnlyList<double> ResolveArcaneEchoScales(PassiveCombatProfile profile, int castCount)
    {
        ArgumentNullException.ThrowIfNull(profile);
        if (!profile.ArcaneEcho || castCount <= 0 || castCount % ArcaneEchoCastInterval != 0) return Array.Empty<double>();
        return profile.EchoChamber ? [1, 1] : [ArcaneEchoDamageMultiplier];
    }

    public static double ApplyIceArmor(PassiveCombatProfile profile, bool barrierActive, double damage)
    {
        ArgumentNullException.ThrowIfNull(profile);
        if (damage <= 0 || !profile.IceArmor || profile.WinterShell || !barrierActive) return damage;
        return damage * IceArmorDamageTakenMultiplier;
    }
}
