using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Progression.SpellMastery;

public sealed record SpellMasteryGoal(SpellId Spell, string Title, string Objective, string Reward, int Progress, int Required, bool FeatDone);

public static class SpellMasteryGoalPlanner
{
    public static IReadOnlyList<SpellMasteryGoal> Next(SpellMasteryState mastery, int count = 3)
    {
        ArgumentNullException.ThrowIfNull(mastery);
        if (count <= 0) return [];
        return SpellLineageCatalog.All
            .Where(lineage => !mastery.Get(lineage.Spell).Unlocked)
            .Select(lineage =>
            {
                var progress = mastery.Get(lineage.Spell);
                var spell = SpellCatalog.Get(lineage.Spell);
                var wyrm = DragonCatalog.Get(lineage.Wyrm);
                var objective = progress.MeaningfulRuns < lineage.RequiredRuns
                    ? $"Reach Rank II {spell.Name} and clear a trail in {lineage.RequiredRuns - progress.MeaningfulRuns} more hunts."
                    : progress.WyrmFeat ? "The Wyrm's secret is ready." : $"Defeat {wyrm.Name} with Rank III {spell.Name}.";
                var feat = progress.WyrmFeat ? "Wyrm feat complete" : $"{wyrm.Name} feat pending";
                return new SpellMasteryGoal(lineage.Spell, $"Awaken {spell.Name}", objective,
                    $"Hidden lineage • {feat}", Math.Min(progress.MeaningfulRuns, lineage.RequiredRuns),
                    lineage.RequiredRuns, progress.WyrmFeat);
            })
            .OrderByDescending(goal => (double)goal.Progress / goal.Required)
            .ThenBy(goal => goal.FeatDone ? 0 : 1)
            .ThenBy(goal => goal.Spell)
            .Take(count)
            .ToArray();
    }
}
