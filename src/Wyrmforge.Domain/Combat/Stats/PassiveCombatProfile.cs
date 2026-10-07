using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.PassiveTree;

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
    bool ArcaneReservoir,
    bool ArcaneEcho,
    bool Prismatic,
    bool EchoChamber,
    bool AstralBarrage)
{
    public static PassiveCombatProfile Create(IReadOnlySet<string> selected)
    {
        var modifiers = BuildModifierSet.Aggregate(selected.Select(id => PassiveTreeCatalog.Get(id).Modifiers));
        return new PassiveCombatProfile(
            modifiers.Apply(BuildStatId.Damage, 1),
            modifiers.Apply(BuildStatId.CastInterval, 1),
            modifiers.Apply(BuildStatId.ProjectileSpeed, 1),
            modifiers.Apply(BuildStatId.MaxHealth, 100),
            modifiers.Apply(BuildStatId.DamageTaken, 1),
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
            selected.Contains("arcane-major"),
            selected.Contains("arcane-echo"),
            selected.Contains("prismatic"),
            selected.Contains("echo-chamber"),
            selected.Contains("astral-barrage"));
    }
}
