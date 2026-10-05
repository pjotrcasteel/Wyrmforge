using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Runs.RealmInfluence;

public static class RealmInfluenceCatalog
{
    private static readonly IReadOnlyDictionary<DragonId, RealmInfluenceProfile> Profiles = new Dictionary<DragonId, RealmInfluenceProfile>
    {
        [DragonId.Ashfang] = new(DragonId.Ashfang,
        [
            Rule(RealmInfluenceEffect.Ashfall, DragonAttentionIntensity.Faint, new("wyrm:ashfang:ashfall", DamageTakenMultiplier: 1.03)),
            Rule(RealmInfluenceEffect.ScorchMarks, DragonAttentionIntensity.Growing, new("wyrm:ashfang:scorch-marks", EnemyHealthMultiplier: 1.05)),
            Rule(RealmInfluenceEffect.HeatHaze, DragonAttentionIntensity.Ominous, new("wyrm:ashfang:heat-haze", RecoveryMultiplier: 0.75)),
            Rule(RealmInfluenceEffect.WyrmShadow, DragonAttentionIntensity.Imminent, new("wyrm:ashfang:wyrm-shadow", ThreatBudgetMultiplier: 1.12)),
        ]),
        [DragonId.Stormcoil] = new(DragonId.Stormcoil,
        [
            Rule(RealmInfluenceEffect.StaticArcs, DragonAttentionIntensity.Faint, new("wyrm:stormcoil:static-arcs", EnemySpeedMultiplier: 1.04)),
            Rule(RealmInfluenceEffect.LightningFlashes, DragonAttentionIntensity.Growing, new("wyrm:stormcoil:lightning-flashes", SpawnIntervalMultiplier: 0.96)),
            Rule(RealmInfluenceEffect.ChargedGround, DragonAttentionIntensity.Ominous, new("wyrm:stormcoil:charged-ground", ThreatBudgetMultiplier: 1.08)),
            Rule(RealmInfluenceEffect.StormPulse, DragonAttentionIntensity.Imminent, new("wyrm:stormcoil:storm-pulse", EnemySpeedMultiplier: 1.06)),
        ]),
        [DragonId.Rimeclaw] = new(DragonId.Rimeclaw,
        [
            Rule(RealmInfluenceEffect.FrostMotes, DragonAttentionIntensity.Faint, new("wyrm:rimeclaw:frost-motes", PlayerMoveSpeedMultiplier: 0.98)),
            Rule(RealmInfluenceEffect.RimeVeins, DragonAttentionIntensity.Growing, new("wyrm:rimeclaw:rime-veins", PlayerMoveSpeedMultiplier: 0.94)),
            Rule(RealmInfluenceEffect.ColdHaze, DragonAttentionIntensity.Ominous, new("wyrm:rimeclaw:cold-haze", RecoveryMultiplier: 0.75)),
            Rule(RealmInfluenceEffect.IcePulse, DragonAttentionIntensity.Imminent, new("wyrm:rimeclaw:ice-pulse", EnemyHealthMultiplier: 1.10)),
        ]),
        [DragonId.Voidweaver] = new(DragonId.Voidweaver,
        [
            Rule(RealmInfluenceEffect.AetherMotes, DragonAttentionIntensity.Faint, new("wyrm:voidweaver:aether-motes", ThreatBudgetMultiplier: 1.04)),
            Rule(RealmInfluenceEffect.RealityFractures, DragonAttentionIntensity.Growing,
                new("wyrm:voidweaver:reality-fractures", HazardKind: WyrmrealmHazardKind.UnstableRifts)),
            Rule(RealmInfluenceEffect.VoidHaze, DragonAttentionIntensity.Ominous, new("wyrm:voidweaver:void-haze", SpawnIntervalMultiplier: 0.95)),
            Rule(RealmInfluenceEffect.ArcanePulse, DragonAttentionIntensity.Imminent, new("wyrm:voidweaver:arcane-pulse", ThreatBudgetMultiplier: 1.10)),
        ]),
    };

    public static RealmInfluenceProfile Get(DragonId dragon) => Profiles.TryGetValue(dragon, out var profile)
        ? profile
        : throw new ArgumentOutOfRangeException(nameof(dragon), dragon, "No realm influence profile is registered for this dragon.");

    private static RealmInfluenceRule Rule(RealmInfluenceEffect effect, DragonAttentionIntensity minimumIntensity, WyrmrealmEncounterModifier modifier) =>
        new(effect, minimumIntensity, modifier);
}
