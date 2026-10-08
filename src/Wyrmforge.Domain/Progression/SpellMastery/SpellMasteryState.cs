using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Domain.Progression.SpellMastery;

public sealed record SpellMasteryEntry(SpellId Spell, int MeaningfulRuns, int BestDepth, bool WyrmFeat)
{
    public bool Unlocked => SpellLineageCatalog.All.Any(definition =>
        definition.Spell == Spell && MeaningfulRuns >= definition.RequiredRuns && WyrmFeat);
}

public sealed record MasteryRunSpell(SpellId Spell, int Rank);
public sealed record MasteryRunEvidence(int CompletedRoutes, int Depth, bool Abandoned,
    IReadOnlySet<SpellId> QualifiedWyrmFeats, IReadOnlyList<MasteryRunSpell> Spells);

public sealed record MasteryRunProgress(IReadOnlyList<SpellId> Progressed, IReadOnlyList<SpellEvolutionId> NewlyUnlocked);

public sealed class SpellMasteryState
{
    private readonly Dictionary<SpellId, SpellMasteryEntry> entries = [];

    public IReadOnlyList<SpellMasteryEntry> Snapshot() => entries.Values.OrderBy(entry => entry.Spell).ToArray();

    public SpellMasteryEntry Get(SpellId spell) => entries.TryGetValue(spell, out var entry)
        ? entry : new SpellMasteryEntry(spell, 0, 0, false);

    public bool Unlocks(SpellEvolutionId evolution) => SpellLineageCatalog.All
        .Any(lineage => lineage.Evolution == evolution && Get(lineage.Spell).Unlocked);

    public int UnlockedCount => SpellLineageCatalog.All.Count(lineage => Get(lineage.Spell).Unlocked);

    public MasteryRunProgress RecordRun(MasteryRunEvidence evidence)
    {
        ArgumentNullException.ThrowIfNull(evidence);
        if (evidence.Abandoned || evidence.CompletedRoutes <= 0)
            return new MasteryRunProgress([], []);

        var progressed = new List<SpellId>();
        var unlocked = new List<SpellEvolutionId>();
        foreach (var lineage in SpellLineageCatalog.All)
        {
            var spell = evidence.Spells.FirstOrDefault(candidate => candidate.Spell == lineage.Spell);
            if (spell is null || spell.Rank < 2) continue;

            var previous = Get(lineage.Spell);
            var feat = previous.WyrmFeat || evidence.QualifiedWyrmFeats.Contains(lineage.Spell);
            var next = previous with
            {
                MeaningfulRuns = Math.Min(9999, previous.MeaningfulRuns + 1),
                BestDepth = Math.Max(previous.BestDepth, evidence.Depth),
                WyrmFeat = feat,
            };
            entries[lineage.Spell] = next;
            progressed.Add(lineage.Spell);
            if (!previous.Unlocked && next.Unlocked) unlocked.Add(lineage.Evolution);
        }

        return new MasteryRunProgress(progressed, unlocked);
    }

    public void Restore(IEnumerable<SpellMasteryEntry> saved)
    {
        ArgumentNullException.ThrowIfNull(saved);
        entries.Clear();
        foreach (var entry in saved)
        {
            if (!SpellLineageCatalog.All.Any(definition => definition.Spell == entry.Spell)) continue;
            entries[entry.Spell] = entry with { MeaningfulRuns = Math.Clamp(entry.MeaningfulRuns, 0, 9999), BestDepth = Math.Max(0, entry.BestDepth) };
        }
    }
}
