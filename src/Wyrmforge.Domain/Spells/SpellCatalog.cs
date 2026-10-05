using Wyrmforge.Domain.Combat.Abilities;

namespace Wyrmforge.Domain.Spells;

public static class SpellCatalog
{
    public static IReadOnlyList<SpellDefinition> All { get; } =
    [
        new(SpellId.ArcaneOrb, "Arcane Orb", "Reliable arcane bolt. Higher ranks hit harder and cast faster.", "◈", SpellSchool.Arcane, 3,
            new AbilityProfile(0.65, 0.06, 18, 0.28, new ProjectileAbilityProfile(410, 20, 5))),
        new(SpellId.FireBolt, "Fire Bolt", "Heavy, slower bolt. Rank III adds an impact blast.", "🔥", SpellSchool.Fire, 3,
            new AbilityProfile(1.15, 0.06, 30, 0.30, new ProjectileAbilityProfile(330, 20, 7))),
        new(SpellId.FrostShard, "Frost Shard", "Fast shard that freezes enemies briefly on hit.", "❄", SpellSchool.Frost, 3,
            new AbilityProfile(0.95, 0.06, 12, 0.25, new ProjectileAbilityProfile(500, 25, 5))),
        new(SpellId.ChainLightning, "Chain Lightning", "Instant lightning that jumps between multiple enemies.", "⚡", SpellSchool.Storm, 3,
            new AbilityProfile(1.35, 0.06, 15, 1d / 3d, new ChainAbilityProfile(2, 1, 0.84))),
    ];

    public static SpellDefinition Get(SpellId id) => All.Single(spell => spell.Id == id);
}
