using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Domain.Progression.RunUpgrades;

public static class RunUpgradeCatalog
{
    public static IReadOnlyList<RunUpgradeDefinition> All { get; } =
    [
        new(RunUpgradeId.Potency, "Potency", "+18% spell damage.", "✦",
        [
            Stats(Percent(BuildStatId.Damage, 0.18)),
            Stats(Percent(BuildStatId.Damage, 0.36)),
            Stats(Percent(BuildStatId.Damage, 0.54)),
            Stats(Percent(BuildStatId.Damage, 0.72)),
            Stats(Percent(BuildStatId.Damage, 0.90)),
        ]),
        new(RunUpgradeId.Quickening, "Quickening", "Cast 12% faster.", "⚡",
        [
            Stats(Multiply(BuildStatId.CastInterval, 1 / 1.12)),
            Stats(Multiply(BuildStatId.CastInterval, 1 / 1.24)),
            Stats(Multiply(BuildStatId.CastInterval, 1 / 1.36)),
            Stats(Multiply(BuildStatId.CastInterval, 1 / 1.48)),
            Stats(Multiply(BuildStatId.CastInterval, 1 / 1.60)),
        ]),
        new(RunUpgradeId.Vitality, "Vitality", "+18 max health and heal 18.", "♥",
        [
            Stats(Flat(BuildStatId.MaxHealth, 18)),
            Stats(Flat(BuildStatId.MaxHealth, 36)),
            Stats(Flat(BuildStatId.MaxHealth, 54)),
            Stats(Flat(BuildStatId.MaxHealth, 72)),
        ]),
        new(RunUpgradeId.Fleetfoot, "Fleetfoot", "+10% movement speed.", "➶",
        [
            Stats(Percent(BuildStatId.MoveSpeed, 0.10)),
            Stats(Percent(BuildStatId.MoveSpeed, 0.20)),
            Stats(Percent(BuildStatId.MoveSpeed, 0.30)),
        ]),
        new(RunUpgradeId.Multicast, "Multicast", "+1 projectile per cast, but each projectile deals 10% less damage.", "✧",
        [
            Stats(Flat(BuildStatId.ExtraProjectiles, 1), Multiply(BuildStatId.Damage, 0.9)),
            Stats(Flat(BuildStatId.ExtraProjectiles, 2), Multiply(BuildStatId.Damage, 0.81)),
        ]),
        new(RunUpgradeId.FrostTouch, "Frost Touch", "Repeated hits freeze enemies. Higher ranks trigger faster and last longer.", "❄",
        [
            Rules(new CombatRuleDefinition(CombatRuleTrigger.Hit, 6, new ApplyStatusRuleEffect(CombatStatusId.Frozen, 0.85))),
            Rules(new CombatRuleDefinition(CombatRuleTrigger.Hit, 5, new ApplyStatusRuleEffect(CombatStatusId.Frozen, 1.05))),
            Rules(new CombatRuleDefinition(CombatRuleTrigger.Hit, 4, new ApplyStatusRuleEffect(CombatStatusId.Frozen, 1.25))),
        ]),
        new(RunUpgradeId.ChainSpark, "Chain Spark", "Projectiles gain +1 chain. Stacks with Storm tree effects.", "ϟ",
        [
            Stats(Flat(BuildStatId.BonusChains, 1)),
            Stats(Flat(BuildStatId.BonusChains, 2)),
        ]),
        new(RunUpgradeId.ArcaneEcho, "Arcane Echo", "Periodically repeat a cast for free. Rank 2 echoes more often and harder.", "◈",
        [
            Rules(new CombatRuleDefinition(CombatRuleTrigger.Cast, 7, new EchoCastRuleEffect(0.55))),
            Rules(new CombatRuleDefinition(CombatRuleTrigger.Cast, 5, new EchoCastRuleEffect(0.8))),
        ]),
        new(RunUpgradeId.Bulwark, "Bulwark", "Harden your warding. Take 8% less damage per rank.", "⬟",
        [
            Stats(Multiply(BuildStatId.DamageTaken, 0.92)),
            Stats(Multiply(BuildStatId.DamageTaken, 0.84)),
            Stats(Multiply(BuildStatId.DamageTaken, 0.76)),
        ]),
        new(RunUpgradeId.Velocity, "Velocity", "Projectiles travel 20% faster per rank.", "➤",
        [
            Stats(Percent(BuildStatId.ProjectileSpeed, 0.20)),
            Stats(Percent(BuildStatId.ProjectileSpeed, 0.40)),
            Stats(Percent(BuildStatId.ProjectileSpeed, 0.60)),
        ]),
        new(RunUpgradeId.Emberbrand, "Emberbrand", "Repeated hits brand enemies with Burning.", "♨",
        [
            Rules(new CombatRuleDefinition(CombatRuleTrigger.Hit, 6, new ApplyStatusRuleEffect(CombatStatusId.Burning, 3.5))),
            Rules(new CombatRuleDefinition(CombatRuleTrigger.Hit, 4, new ApplyStatusRuleEffect(CombatStatusId.Burning, 4.5))),
        ]),
        new(RunUpgradeId.StaticCharge, "Static Charge", "Repeated hits Shock enemies, making follow-up damage stronger.", "↯",
        [
            Rules(new CombatRuleDefinition(CombatRuleTrigger.Hit, 7, new ApplyStatusRuleEffect(CombatStatusId.Shocked, 3))),
            Rules(new CombatRuleDefinition(CombatRuleTrigger.Hit, 5, new ApplyStatusRuleEffect(CombatStatusId.Shocked, 4))),
        ]),
    ];

    public static RunUpgradeDefinition Get(RunUpgradeId id) => All.Single(upgrade => upgrade.Id == id);

    private static BuildModifierProfile Stats(params BuildStatModifier[] stats) => new(stats);

    private static BuildModifierProfile Rules(params CombatRuleDefinition[] rules) => new(Array.Empty<BuildStatModifier>(), rules);

    private static BuildStatModifier Flat(BuildStatId stat, double value) => new(stat, BuildStatOperation.FlatAdd, value);

    private static BuildStatModifier Percent(BuildStatId stat, double value) => new(stat, BuildStatOperation.PercentAdd, value);

    private static BuildStatModifier Multiply(BuildStatId stat, double value) => new(stat, BuildStatOperation.Multiply, value);
}
