namespace Wyrmforge.Domain.Combat.Stats;

public sealed record PassiveCombatProfile(
    double DamageMultiplier,
    double CastIntervalMultiplier,
    double ProjectileSpeedMultiplier,
    double MaxHealth,
    double DamageTakenMultiplier,
    bool Wildfire,
    bool Detonation,
    bool Inferno,
    bool Volcanic,
    bool DeepFreeze,
    bool IceArmor,
    bool AbsoluteZero,
    bool WinterShell,
    bool Chainstorm,
    bool TempestStep,
    bool LivingStorm,
    bool LightningForm,
    bool ArcaneEcho,
    bool Prismatic,
    bool EchoChamber,
    bool AstralBarrage)
{
    public static PassiveCombatProfile Create(IReadOnlySet<string> selected)
    {
        var damageMultiplier = 1 + Count(selected, "fire-1", "fire-2") * 0.05;
        if (selected.Contains("fire-major")) damageMultiplier *= 1.25;

        var castIntervalMultiplier = 1 / (1 + Count(selected, "storm-1", "storm-2") * 0.04);
        if (selected.Contains("storm-major")) castIntervalMultiplier *= 0.75;

        var projectileSpeedMultiplier = 1 + Count(selected, "arcane-1", "arcane-2") * 0.05;
        if (selected.Contains("arcane-major")) projectileSpeedMultiplier *= 1.3;

        return new PassiveCombatProfile(
            damageMultiplier,
            castIntervalMultiplier,
            projectileSpeedMultiplier,
            100 + Count(selected, "frost-1", "frost-2") * 4,
            selected.Contains("frost-major") ? 0.85 : 1,
            selected.Contains("wildfire"),
            selected.Contains("detonation"),
            selected.Contains("inferno"),
            selected.Contains("volcanic"),
            selected.Contains("deep-freeze"),
            selected.Contains("ice-armor"),
            selected.Contains("absolute-zero"),
            selected.Contains("winter-shell"),
            selected.Contains("chainstorm"),
            selected.Contains("tempest-step"),
            selected.Contains("living-storm"),
            selected.Contains("lightning-form"),
            selected.Contains("arcane-echo"),
            selected.Contains("prismatic"),
            selected.Contains("echo-chamber"),
            selected.Contains("astral-barrage"));
    }

    private static int Count(IReadOnlySet<string> selected, params string[] ids) => ids.Count(selected.Contains);
}
