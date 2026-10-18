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

    /// <param name="firstLink">
    /// False for a chain's later jumps and forks. Stormglass carries its frost in one discharge: only the first strike freezes.
    /// Freezing a whole chain made a Storm hybrid out-control pure Frost (BalanceLab: 23% of enemy-seconds denied against Frost's
    /// 8%; 4% after this rule, with Storm's kill power unchanged), and frozen targets fed the synergy's own bonus jumps.
    /// </param>
    public static IReadOnlyList<ProjectileStatusEffect> Resolve(SpellId primary, SpellBook spells, SynergySelection combinations, bool firstLink = true)
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
            var duration = freeze.CalculateDurationSeconds(spells[SpellId.FrostShard]);
            return firstLink ? [new(CombatStatusId.Frozen, duration)] : [];
        }
        return [];
    }
}
