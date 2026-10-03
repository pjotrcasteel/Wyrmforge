namespace Wyrmforge.Domain.Spells.Synergies;

public static class SynergyCatalog
{
    public static IReadOnlyList<SynergyDefinition> All { get; } =
    [
        new(SynergyId.Frostfire, "Frostfire", "Fire Bolt shatters frozen enemies for ×2 damage and a larger blast.", "🔥❄", [SpellId.FireBolt, SpellId.FrostShard]),
        new(SynergyId.Stormglass, "Stormglass", "Chain Lightning striking frozen enemies deals +50% damage and gains 2 extra jumps.", "⚡❄", [SpellId.ChainLightning, SpellId.FrostShard]),
        new(SynergyId.ArcaneConduit, "Arcane Conduit", "Every 4th Arcane Orb hit discharges a smaller Chain Lightning from the target.", "◈⚡", [SpellId.ArcaneOrb, SpellId.ChainLightning]),
    ];

    public static SynergyDefinition Get(SynergyId id) => All.Single(synergy => synergy.Id == id);
}
