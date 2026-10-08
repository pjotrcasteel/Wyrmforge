using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Application.Runs.Hunts;

public static class GreatHuntDuelQualification
{
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
