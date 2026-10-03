namespace Wyrmforge.Domain.Spells;

public static class SpellCatalog
{
    public static IReadOnlyList<SpellDefinition> All { get; } =
    [
        new(SpellId.ArcaneOrb, "Arcane Orb", "Reliable arcane bolt. Higher ranks hit harder and cast faster.", "◈", SpellSchool.Arcane, 3),
        new(SpellId.FireBolt, "Fire Bolt", "Heavy, slower bolt. Rank III adds an impact blast.", "🔥", SpellSchool.Fire, 3),
        new(SpellId.FrostShard, "Frost Shard", "Fast shard that freezes enemies briefly on hit.", "❄", SpellSchool.Frost, 3),
        new(SpellId.ChainLightning, "Chain Lightning", "Instant lightning that jumps between multiple enemies.", "⚡", SpellSchool.Storm, 3),
    ];

    public static SpellDefinition Get(SpellId id) => All.Single(spell => spell.Id == id);
}
