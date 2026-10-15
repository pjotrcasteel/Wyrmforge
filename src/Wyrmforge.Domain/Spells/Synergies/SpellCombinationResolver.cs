using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Domain.Spells.Synergies;

public static class SpellCombinationResolver
{
    public static SynergyId? ActiveFor(SpellId primary, SpellBook spells, SynergySelection combinations)
    {
        if (primary != spells.ActiveSpell) return null;
        return SynergyCatalog.All.FirstOrDefault(combination => combinations.Contains(combination.Id) && combination.CanHost(primary))?.Id;
    }

    public static IReadOnlyList<ProjectileStatusEffect> Resolve(SpellId primary, SpellBook spells, SynergySelection combinations)
    {
        var active = ActiveFor(primary, spells, combinations);
        if (active == SynergyId.Frostfire)
        {
            var freeze = SpellCatalog.Get(SpellId.FrostShard).Ability.Status!;
            var effects = new List<ProjectileStatusEffect> { new(CombatStatusId.Burning, 3.5) };
            if (primary != SpellId.FrostShard) effects.Add(new(CombatStatusId.Frozen, freeze.CalculateDurationSeconds(spells[SpellId.FrostShard])));
            return effects;
        }
        if (active == SynergyId.Stormglass)
        {
            var freeze = SpellCatalog.Get(SpellId.FrostShard).Ability.Status!;
            return [new(CombatStatusId.Frozen, freeze.CalculateDurationSeconds(spells[SpellId.FrostShard]))];
        }
        return [];
    }
}
