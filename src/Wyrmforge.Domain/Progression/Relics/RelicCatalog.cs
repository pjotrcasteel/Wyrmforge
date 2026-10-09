using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Domain.Progression.Relics;

public static class RelicCatalog
{
    public static IReadOnlyList<RelicDefinition> All { get; } =
    [
        new(RelicId.EmberheartCharm, "Emberheart Charm", "✹", RelicRarity.Rare, "+18% damage. Every 4th hit burns for 4s. Burning kills explode for 24 damage and spread burn.",
            new BuildModifierProfile([Multiply(BuildStatId.Damage, 1.18)], [new(CombatRuleTrigger.Hit, 4, new ApplyStatusRuleEffect(CombatStatusId.Burning, 4))]))
            { DefeatBurst = new(CombatStatusId.Burning, 24, 76, 2) },
        new(RelicId.ChronoglassShard, "Chronoglass Shard", "◴", RelicRarity.Rare, "Cast intervals are 12% shorter. Every 6th cast echoes at 60% damage.",
            new BuildModifierProfile([Multiply(BuildStatId.CastInterval, 0.88)], [new(CombatRuleTrigger.Cast, 6, new EchoCastRuleEffect(0.6))])),
        new(RelicId.GalefootSigil, "Galefoot Sigil", "≋", RelicRarity.Common, "Move 20% faster. Projectiles travel 30% faster.",
            Stats(Multiply(BuildStatId.MoveSpeed, 1.20), Multiply(BuildStatId.ProjectileSpeed, 1.30))),
        new(RelicId.Vitalstone, "Vitalstone", "◆", RelicRarity.Common, "+24 maximum health; heal the increase when first acquired.",
            Stats(Flat(BuildStatId.MaxHealth, 24))),
        new(RelicId.MirrorPrism, "Mirror Prism", "◇", RelicRarity.Rare, "+1 projectile per cast. Each projectile deals 8% less damage.",
            Stats(Flat(BuildStatId.ExtraProjectiles, 1), Multiply(BuildStatId.Damage, 0.92))),
        new(RelicId.Stormhook, "Stormhook", "ϟ", RelicRarity.Common, "+1 chain. Every 5th hit shocks its target for 3 seconds.",
            new BuildModifierProfile([Flat(BuildStatId.BonusChains, 1)], [new(CombatRuleTrigger.Hit, 5, new ApplyStatusRuleEffect(CombatStatusId.Shocked, 3))])),
        new(RelicId.IronbarkTotem, "Ironbark Totem", "⬟", RelicRarity.Rare, "Take 25% less damage.",
            Stats(Multiply(BuildStatId.DamageTaken, 0.75))),
        new(RelicId.DuelistLens, "Duelist Lens", "◉", RelicRarity.Rare, "+1 chain, +8% damage. Chilled or frozen kills shatter for 18 damage and spread chill.",
            Stats(Flat(BuildStatId.BonusChains, 1), Multiply(BuildStatId.Damage, 1.08)))
            { DefeatBurst = new(CombatStatusId.Chilled, 18, 88, 2) },
    ];

    public static RelicDefinition Get(RelicId id) => All.Single(definition => definition.Id == id);

    private static BuildModifierProfile Stats(params BuildStatModifier[] stats) => new(stats);

    private static BuildStatModifier Flat(BuildStatId stat, double value) => new(stat, BuildStatOperation.FlatAdd, value);

    private static BuildStatModifier Multiply(BuildStatId stat, double value) => new(stat, BuildStatOperation.Multiply, value);
}
