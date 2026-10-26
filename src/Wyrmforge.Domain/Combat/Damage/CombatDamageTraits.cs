using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Domain.Combat.Damage;

/// <summary>Orthogonal damage identities. Visual presentation cannot alter damage or kills.</summary>
[Flags]
public enum CombatDamageTraits
{
    None = 0,
    Fire = 1,
    Explosive = 2,
    Frost = 4,
    Storm = 8,
    Arcane = 16,
    Piercing = 32,
    Force = 64
}

public static class CombatDamageProfile
{
    public static CombatDamageTraits ForSpell(SpellId spell, SynergyId? synergy = null)
    {
        var primary = spell switch
        {
        SpellId.FireBolt => CombatDamageTraits.Fire | CombatDamageTraits.Explosive,
        SpellId.CinderNeedle => CombatDamageTraits.Fire | CombatDamageTraits.Piercing,
        SpellId.FrostShard or SpellId.IceLance => CombatDamageTraits.Frost | CombatDamageTraits.Piercing,
        SpellId.ChainLightning or SpellId.BallLightning => CombatDamageTraits.Storm,
        SpellId.ArcaneOrb => CombatDamageTraits.Arcane | CombatDamageTraits.Force,
        SpellId.AetherDart => CombatDamageTraits.Arcane | CombatDamageTraits.Piercing,
        _ => CombatDamageTraits.None
        };
        // Compound sources keep their original trait; an infusion adds its
        // actual elemental identity without awarding cosmetic damage.
        return synergy switch
        {
            SynergyId.Frostfire => primary | CombatDamageTraits.Fire | CombatDamageTraits.Frost,
            SynergyId.Stormglass => primary | CombatDamageTraits.Storm | CombatDamageTraits.Frost,
            SynergyId.ArcaneConduit => primary | CombatDamageTraits.Arcane | CombatDamageTraits.Storm,
            _ => primary
        };
    }

    public static bool IsIncendiaryBlast(CombatDamageTraits traits) =>
        (traits & (CombatDamageTraits.Fire | CombatDamageTraits.Explosive)) ==
        (CombatDamageTraits.Fire | CombatDamageTraits.Explosive);
}
