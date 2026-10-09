using Wyrmforge.Domain.Combat.Abilities;
using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Domain.Spells;

public static class SpellCatalog
{
    public static IReadOnlyList<SpellDefinition> All { get; } =
    [
        new(SpellId.ArcaneOrb, "Arcane Orb", "Rank II pierces one extra target. Rank III hits harder with a wider bolt.", "◈", SpellSchool.Arcane, 3,
            new AbilityProfile(0.65, 0.06, 18, 0.28, new ProjectileAbilityProfile(410, 20, 5))),
        new(SpellId.FireBolt, "Fire Bolt", "Heavy, slower bolt. Rank III adds an impact blast.", "🔥", SpellSchool.Fire, 3,
            new AbilityProfile(1.15, 0.06, 30, 0.30, new ProjectileAbilityProfile(330, 20, 7))),
        new(SpellId.FrostShard, "Frost Shard", "Fast shard that freezes enemies briefly on hit.", "❄", SpellSchool.Frost, 3,
            new AbilityProfile(0.95, 0.06, 16, 0.25, new ProjectileAbilityProfile(500, 25, 5),
                new AbilityStatusProfile(CombatStatusId.Frozen, 0.70, 0.18))),
        new(SpellId.ChainLightning, "Chain Lightning", "Instant lightning that jumps between multiple enemies.", "⚡", SpellSchool.Storm, 3,
            new AbilityProfile(1.35, 0.06, 15, 1d / 3d, new ChainAbilityProfile(2, 1, 0.84))),
        new(SpellId.CinderNeedle, "Cinder Needle", "Rapid fire needle that stacks Burning damage over time.", "✹", SpellSchool.Fire, 3,
            new AbilityProfile(0.62, 0.04, 9, 0.22, new ProjectileAbilityProfile(560, 25, 4),
                new AbilityStatusProfile(CombatStatusId.Burning, 3.5, 0.5))),
        new(SpellId.IceLance, "Ice Lance", "Heavy frost lance that Chills targets and slows their actions.", "◆", SpellSchool.Frost, 3,
            new AbilityProfile(1.35, 0.05, 27, 0.28, new ProjectileAbilityProfile(440, 20, 6),
                new AbilityStatusProfile(CombatStatusId.Chilled, 2.4, 0.4))),
        new(SpellId.BallLightning, "Ball Lightning", "Volatile lightning that jumps aggressively and leaves targets Shocked.", "ϟ", SpellSchool.Storm, 3,
            new AbilityProfile(1.1, 0.05, 11, 0.25, new ChainAbilityProfile(3, 1, 0.78),
                new AbilityStatusProfile(CombatStatusId.Shocked, 3, 0.4))),
        new(SpellId.AetherDart, "Aether Dart", "Quick arcane dart that stacks Arcane Mark and exposes targets to more damage.", "◇", SpellSchool.Arcane, 3,
            new AbilityProfile(0.78, 0.05, 13, 0.24, new ProjectileAbilityProfile(520, 30, 4.5),
                new AbilityStatusProfile(CombatStatusId.ArcaneMark, 4, 0.5))),
    ];

    public static SpellDefinition Get(SpellId id) => All.Single(spell => spell.Id == id);
}
