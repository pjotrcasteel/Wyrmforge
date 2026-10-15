using Wyrmforge.Domain.Combat.Abilities;
using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Domain.Spells.Composition;

// Structural traits a component can require or grant. Compatibility is decided by tags, never by
// special-casing individual SpellIds, so new foundations and FLC components slot in by data alone.
public enum SpellTag
{
    Projectile,
    Chain,
    Impact,
    Fire,
    Frost,
    Storm,
    Arcane,
    AppliesFreeze,
    AppliesBurn,
    AppliesChill,
    AppliesShock,
    AppliesMark,
    Charged,
}

public static class SpellTags
{
    public static SpellTag Element(SpellSchool school) => school switch
    {
        SpellSchool.Fire => SpellTag.Fire,
        SpellSchool.Frost => SpellTag.Frost,
        SpellSchool.Storm => SpellTag.Storm,
        _ => SpellTag.Arcane,
    };

    // Derived from the spell's own definition (delivery, school and status), not from a hand-kept list.
    public static IReadOnlySet<SpellTag> For(SpellId id)
    {
        var spell = SpellCatalog.Get(id);
        var tags = new HashSet<SpellTag> { Element(spell.School) };
        switch (spell.Ability.Delivery)
        {
            case ProjectileAbilityProfile:
                tags.Add(SpellTag.Projectile);
                tags.Add(SpellTag.Impact);
                break;
            case ChainAbilityProfile:
                tags.Add(SpellTag.Chain);
                break;
        }
        if (spell.Ability.Status?.Status is { } status) tags.Add(Applies(status));
        return tags;
    }

    private static SpellTag Applies(CombatStatusId status) => status switch
    {
        CombatStatusId.Frozen => SpellTag.AppliesFreeze,
        CombatStatusId.Burning => SpellTag.AppliesBurn,
        CombatStatusId.Chilled => SpellTag.AppliesChill,
        CombatStatusId.Shocked => SpellTag.AppliesShock,
        _ => SpellTag.AppliesMark,
    };

    public static string Describe(SpellTag tag) => tag switch
    {
        SpellTag.Projectile => "a projectile",
        SpellTag.Chain => "a chain",
        SpellTag.Impact => "an impact",
        SpellTag.Fire => "Fire",
        SpellTag.Frost => "Frost",
        SpellTag.Storm => "Storm",
        SpellTag.Arcane => "Arcane",
        SpellTag.AppliesFreeze => "something that freezes",
        SpellTag.AppliesBurn => "something that burns",
        SpellTag.AppliesChill => "something that chills",
        SpellTag.AppliesShock => "something that shocks",
        SpellTag.AppliesMark => "something that marks",
        _ => "a stored charge",
    };
}
