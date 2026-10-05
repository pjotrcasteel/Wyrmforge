using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.Relics;

public static class RelicCatalog
{
    public static IReadOnlyList<RelicDefinition> All { get; } =
    [
        new(RelicId.EmberheartCharm, "Emberheart Charm", "✹", RelicRarity.Rare, "A coal that never cools. Your spells strike 18% harder.",
            Stats(Multiply(BuildStatId.Damage, 1.18))),
        new(RelicId.ChronoglassShard, "Chronoglass Shard", "◴", RelicRarity.Rare, "Time fractures around your casting hand. Spell intervals are 12% shorter.",
            Stats(Multiply(BuildStatId.CastInterval, 0.88))),
        new(RelicId.GalefootSigil, "Galefoot Sigil", "≋", RelicRarity.Common, "A feather-light rune that pulls you between heartbeats. Move 12% faster.",
            Stats(Multiply(BuildStatId.MoveSpeed, 1.12))),
        new(RelicId.Vitalstone, "Vitalstone", "◆", RelicRarity.Common, "A warm stone that beats like a second heart. Gain 24 maximum vitality.",
            Stats(Flat(BuildStatId.MaxHealth, 24))),
    ];

    public static RelicDefinition Get(RelicId id) => All.Single(definition => definition.Id == id);

    private static BuildModifierProfile Stats(params BuildStatModifier[] stats) => new(stats);

    private static BuildStatModifier Flat(BuildStatId stat, double value) => new(stat, BuildStatOperation.FlatAdd, value);

    private static BuildStatModifier Multiply(BuildStatId stat, double value) => new(stat, BuildStatOperation.Multiply, value);
}
