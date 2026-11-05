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
                var objective = ObjectiveFor(lineage.Spell, spell.Name, wyrm.Name, progress, lineage.RequiredRuns);
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

    private static string ObjectiveFor(SpellId spell, string spellName, string wyrmName, SpellMasteryEntry progress, int requiredRuns)
    {
        if (spell == SpellId.FireBolt) return FireballObjective(progress, requiredRuns);
        if (progress.MeaningfulRuns < requiredRuns)
            return $"Reach Rank II {spellName} and clear a trail in {requiredRuns - progress.MeaningfulRuns} more hunts.";

        return progress.WyrmFeat ? "The Wyrm's secret is ready." : $"Defeat {wyrmName} with Rank III {spellName}.";
    }

    private static string FireballObjective(SpellMasteryEntry progress, int requiredRuns)
    {
        if (progress.MeaningfulRuns < requiredRuns)
            return $"Equip a mutator on Fireball Lv.2+, clear at least 3 trails, and extract from {requiredRuns - progress.MeaningfulRuns} more Hunts.";

        return progress.WyrmFeat ? "The Wyrmfire lineage is awakened."
            : "Defeat Ascendant or Elder Ashfang with Fireball Lv.3+ and two equipped mutators.";
    }
}
