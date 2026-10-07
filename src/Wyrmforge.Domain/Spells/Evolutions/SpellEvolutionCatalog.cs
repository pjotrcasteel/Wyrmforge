namespace Wyrmforge.Domain.Spells.Evolutions;

public static class SpellEvolutionCatalog
{
    public static IReadOnlyList<SpellEvolutionDefinition> All { get; } =
    [
        new(SpellEvolutionId.RiftSpear, SpellId.ArcaneOrb, "Rift Spear", "Arcane Orb becomes a heavier phase spear with extreme pierce and projectile speed.", "◆",
            new(DamageMultiplier: 1.28, CastIntervalMultiplier: 1.10, ProjectileSpeedMultiplier: 1.30, ProjectileRadiusMultiplier: 1.18, BonusPierces: 3)),
        new(SpellEvolutionId.StarSwarm, SpellId.ArcaneOrb, "Star Swarm", "Arcane Orb splits into three rapid stars. Each star is weaker, but the sky fills quickly.", "✦",
            new(DamageMultiplier: 0.58, CastIntervalMultiplier: 0.86, ProjectileSpeedMultiplier: 1.15, ExtraProjectiles: 2)),
        new(SpellEvolutionId.MeteorHeart, SpellId.FireBolt, "Meteor Heart", "Fire Bolt becomes a slow catastrophic impact with a much larger blast.", "☄",
            new(DamageMultiplier: 1.55, CastIntervalMultiplier: 1.24, ProjectileRadiusMultiplier: 1.35, SplashRadius: 112)),
        new(SpellEvolutionId.PhoenixVolley, SpellId.FireBolt, "Phoenix Volley", "Fire Bolt fans into three faster embers that carry smaller impact blasts.", "🜂",
            new(DamageMultiplier: 0.68, CastIntervalMultiplier: 0.90, ProjectileSpeedMultiplier: 1.20, ExtraProjectiles: 2, SplashRadius: 42)),
        new(SpellEvolutionId.Shatterglass, SpellId.FrostShard, "Shatterglass", "Every Frost Shard erupts into a wide freezing nova, trading some direct damage for control.", "✧",
            new(DamageMultiplier: 0.88, ProjectileRadiusMultiplier: 1.15, FrostNovaRadius: 118, StatusDurationMultiplier: 1.10)),
        new(SpellEvolutionId.WinterBloom, SpellId.FrostShard, "Winter Bloom", "Frost Shard blooms into three quick shards with longer freezes.", "❆",
            new(DamageMultiplier: 0.62, CastIntervalMultiplier: 0.82, ExtraProjectiles: 2, StatusDurationMultiplier: 1.35)),
        new(SpellEvolutionId.TempestWeb, SpellId.ChainLightning, "Tempest Web", "Chain Lightning spreads through far more targets and loses less power between jumps.", "⌁",
            new(DamageMultiplier: 0.78, BonusChains: 4, ChainFalloffMultiplier: 1.09)),
        new(SpellEvolutionId.Thunderhead, SpellId.ChainLightning, "Thunderhead", "Chain Lightning becomes a slower, brutal discharge with a stronger arc and one extra jump.", "ϟ",
            new(DamageMultiplier: 1.42, CastIntervalMultiplier: 1.18, BonusChains: 1, ChainFalloffMultiplier: 1.06)),
        new(SpellEvolutionId.WildfireNeedles, SpellId.CinderNeedle, "Wildfire Needles", "Cinder Needles split and burst on impact, spreading longer Burning through packs.", "♨",
            new(DamageMultiplier: 0.82, ExtraProjectiles: 1, SplashRadius: 48, StatusDurationMultiplier: 1.35)),
        new(SpellEvolutionId.Ashstorm, SpellId.CinderNeedle, "Ashstorm", "Cinder Needle becomes a relentless piercing stream with much faster casts.", "≋",
            new(DamageMultiplier: 0.70, CastIntervalMultiplier: 0.64, ProjectileSpeedMultiplier: 1.25, BonusPierces: 1, StatusDurationMultiplier: 0.85)),
        new(SpellEvolutionId.PermafrostSpear, SpellId.IceLance, "Permafrost Spear", "Ice Lance becomes a piercing control spear whose Chill lingers far longer.", "♢",
            new(DamageMultiplier: 1.15, CastIntervalMultiplier: 1.08, BonusPierces: 2, StatusDurationMultiplier: 1.75)),
        new(SpellEvolutionId.Hailbreaker, SpellId.IceLance, "Hailbreaker", "Ice Lance becomes a massive impact projectile that bursts through clustered enemies.", "⬙",
            new(DamageMultiplier: 1.48, CastIntervalMultiplier: 1.16, ProjectileRadiusMultiplier: 1.25, SplashRadius: 78)),
        new(SpellEvolutionId.StormCore, SpellId.BallLightning, "Storm Core", "Ball Lightning becomes a living web of arcs with extra jumps and longer Shock.", "⊛",
            new(DamageMultiplier: 0.80, BonusChains: 5, StatusDurationMultiplier: 1.30, ChainFalloffMultiplier: 1.08)),
        new(SpellEvolutionId.Overcharge, SpellId.BallLightning, "Overcharge", "Ball Lightning condenses into a slower, violent discharge that hits much harder and Shocks longer.", "↯",
            new(DamageMultiplier: 1.48, CastIntervalMultiplier: 1.22, BonusChains: 1, StatusDurationMultiplier: 1.65)),
        new(SpellEvolutionId.PhaseBarrage, SpellId.AetherDart, "Phase Barrage", "Aether Dart splits into three phase darts that pierce through targets.", "⋈",
            new(DamageMultiplier: 0.60, CastIntervalMultiplier: 0.88, ExtraProjectiles: 2, BonusPierces: 2)),
        new(SpellEvolutionId.Markstorm, SpellId.AetherDart, "Markstorm", "Aether Dart fires much faster and applies an additional Arcane Mark stack on every hit.", "◇",
            new(DamageMultiplier: 0.86, CastIntervalMultiplier: 0.72, StatusDurationMultiplier: 1.35, BonusStatusStacks: 1)),
    ];

    public static SpellEvolutionDefinition Get(SpellEvolutionId id) => All.Single(definition => definition.Id == id);

    public static IReadOnlyList<SpellEvolutionDefinition> For(SpellId spell) => All.Where(definition => definition.Spell == spell).ToArray();
}
