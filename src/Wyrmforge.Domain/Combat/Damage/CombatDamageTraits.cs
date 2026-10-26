using Wyrmforge.Domain.Spells;

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
    public static CombatDamageTraits ForSpell(SpellId spell) => spell switch
    {
        SpellId.FireBolt => CombatDamageTraits.Fire | CombatDamageTraits.Explosive,
        SpellId.CinderNeedle => CombatDamageTraits.Fire | CombatDamageTraits.Piercing,
        SpellId.FrostShard or SpellId.IceLance => CombatDamageTraits.Frost | CombatDamageTraits.Piercing,
        SpellId.ChainLightning or SpellId.BallLightning => CombatDamageTraits.Storm,
        SpellId.ArcaneOrb => CombatDamageTraits.Arcane | CombatDamageTraits.Force,
        SpellId.AetherDart => CombatDamageTraits.Arcane | CombatDamageTraits.Piercing,
        _ => CombatDamageTraits.None
    };

    public static bool IsIncendiaryBlast(CombatDamageTraits traits) =>
        (traits & (CombatDamageTraits.Fire | CombatDamageTraits.Explosive)) ==
        (CombatDamageTraits.Fire | CombatDamageTraits.Explosive);
}
