using Wyrmforge.Domain.Combat.Interactions;
using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Domain.Spells.Synergies;

public static class SynergyCatalog
{
    public static IReadOnlyList<SynergyDefinition> All { get; } =
    [
        new(SynergyId.Frostfire, "Frostfire", "Fire Bolt shatters frozen enemies for ×2 damage and a larger blast.", "🔥❄", [SpellId.FireBolt, SpellId.FrostShard],
            [new StatusInteractionRule(SpellId.FireBolt, CombatStatusId.Frozen, DamageMultiplier: 2, SplashRadius: 92, SplashDamageMultiplier: 0.45)]),
        new(SynergyId.Stormglass, "Stormglass", "Chain Lightning striking frozen enemies deals +50% damage and gains 2 extra jumps.", "⚡❄", [SpellId.ChainLightning, SpellId.FrostShard],
            [new StatusInteractionRule(SpellId.ChainLightning, CombatStatusId.Frozen, DamageMultiplier: 1.5, BonusJumps: 2)]),
        new(SynergyId.ArcaneConduit, "Arcane Conduit", "Every 4th Arcane Orb hit discharges a smaller Chain Lightning from the target.", "◈⚡", [SpellId.ArcaneOrb, SpellId.ChainLightning]),
    ];

    public static SynergyDefinition Get(SynergyId id) => All.Single(synergy => synergy.Id == id);
}
