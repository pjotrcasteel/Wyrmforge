using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Application.Runs.Hunts;

public static class GreatHuntDuelQualification
{
    /// <summary>
    /// A prepared Fireball earns Ashfang's empowered duel only against its Tier-II or higher Hunt,
    /// with a genuinely upgraded and mutated signature already equipped before the fight.
    /// </summary>
    public static bool QualifiesFireSignature(DragonDefinition wyrm, HuntSelection? hunt, SpellBook spells,
        int fireballLevel, IEnumerable<FireballMutationId> equipped)
    {
        ArgumentNullException.ThrowIfNull(wyrm);
        ArgumentNullException.ThrowIfNull(spells);
        ArgumentNullException.ThrowIfNull(equipped);
        return wyrm.Id == DragonId.Ashfang && hunt is not null && hunt.Target == wyrm.Id && hunt.TierNumber >= 2
            && spells.ActiveSpell == SpellId.FireBolt && spells[SpellId.FireBolt] > 0
            && FireSignatureMasteryCriteria.QualifiesEmpoweredDuel(fireballLevel, equipped);
    }

    // Evaluate at the instant of the kill. A later Rank III upgrade or evolution must never retroactively award the feat.
    public static bool Qualifies(DragonDefinition wyrm, int depth, SpellBook spells, SpellEvolutionSelection evolutions)
    {
        ArgumentNullException.ThrowIfNull(wyrm);
        ArgumentNullException.ThrowIfNull(spells);
        ArgumentNullException.ThrowIfNull(evolutions);
        return depth >= 2 && SpellCatalog.All.Any(spell => spell.School == wyrm.School
            && spells[spell.Id] >= spell.MaxRank && evolutions.For(spell.Id) is not null);
    }
}
