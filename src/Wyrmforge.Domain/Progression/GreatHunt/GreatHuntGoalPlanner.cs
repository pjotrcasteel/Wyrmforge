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
            .Where(oath => !hunt.IsSealed(oath.Wyrm, mastery) || oath.Wyrm == DragonId.Ashfang && !hunt.Get(oath.Wyrm).AscendantDefeated)
            .Select(oath =>
            {
                var entry = hunt.Get(oath.Wyrm);
                if (hunt.IsSealed(oath.Wyrm, mastery))
                {
                    return new GreatHuntGoal(oath.Wyrm, "Ascendant Ashfang", "Invoke the rite in the Run Hub, then defeat Ascendant Ashfang at Depth II.",
                        "Permanent Crown of Embers trophy • the first Ascendant conquered", entry.AscendantDefeated ? 1 : 0, 1);
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
