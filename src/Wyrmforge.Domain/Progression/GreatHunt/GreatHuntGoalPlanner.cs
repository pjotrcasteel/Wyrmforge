using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.SpellMastery;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Progression.GreatHunt;

public sealed record GreatHuntGoal(DragonId Wyrm, string Title, string Objective, string Reward, int Progress, int Required);

public static class GreatHuntGoalPlanner
{
    public static IReadOnlyList<GreatHuntGoal> Next(GreatHuntState hunt, SpellMasteryState mastery, int count = 3)
    {
        ArgumentNullException.ThrowIfNull(hunt);
        ArgumentNullException.ThrowIfNull(mastery);
        if (count <= 0) return [];

        return GreatHuntCatalog.All
            .Where(oath => !hunt.IsSealed(oath.Wyrm, mastery) || AscendantRiteCatalog.IsAvailable(oath.Wyrm) && !hunt.Get(oath.Wyrm).AscendantDefeated)
            .Select(oath =>
            {
                var entry = hunt.Get(oath.Wyrm);
                if (hunt.IsSealed(oath.Wyrm, mastery))
                {
                    var rite = AscendantRiteCatalog.Get(oath.Wyrm);
                    return new GreatHuntGoal(oath.Wyrm, $"Ascendant {oath.Wyrm}", $"Invoke the rite in the Run Hub and defeat Ascendant {oath.Wyrm} at Depth II.",
                        $"Permanent {rite.Trophy} trophy • replayable Ascendant duel", entry.AscendantDefeated ? 1 : 0, 1);
                }

                var lineage = mastery.Get(oath.LineageSpell).Unlocked;
                var wyrm = DragonCatalog.Get(oath.Wyrm).Name;
                var next = !entry.Slain ? $"Defeat {wyrm} to mark the first oath."
                    : !entry.EssenceSecured ? $"Secure any {wyrm} Essence at the Forge or Refuge."
                    : !entry.DeepEvolvedDuel ? $"Defeat {wyrm} at Depth II+ with an evolved {DragonCatalog.Get(oath.Wyrm).School} spell already active."
                    : $"Awaken {SpellCatalog.Get(oath.LineageSpell).Name}'s Wyrmforged lineage.";
                return new GreatHuntGoal(oath.Wyrm, oath.Name, next, "Permanent Great Hunt seal • future Ascendant path",
                    entry.Feats + (lineage ? 1 : 0), 4);
            })
            .OrderByDescending(goal => goal.Progress)
            .ThenBy(goal => goal.Wyrm)
            .Take(count)
            .ToArray();
    }
}
