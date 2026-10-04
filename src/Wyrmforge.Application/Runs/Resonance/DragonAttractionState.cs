using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Resonance;

public sealed class DragonAttractionState
{
    public const int BaseWeight = 6;
    public const int MatchingResonanceWeight = 4;

    public IReadOnlyList<DragonAttractionEntry> Calculate(IReadOnlyList<RunResonanceEntry> resonance, IReadOnlySet<DragonId>? excluded = null)
    {
        var candidates = DragonCatalog.All.Where(dragon => excluded is null || !excluded.Contains(dragon.Id)).ToArray();
        if (candidates.Length == 0) candidates = DragonCatalog.All.ToArray();

        var weights = candidates.Select(dragon => new { dragon.Id, Weight = BaseWeight + Value(resonance, dragon.School) * MatchingResonanceWeight }).ToArray();
        var totalWeight = weights.Sum(entry => entry.Weight);
        return weights.Select(entry => new DragonAttractionEntry(entry.Id, entry.Weight, entry.Weight / (double)totalWeight)).ToArray();
    }

    public DragonId Roll(IReadOnlyList<RunResonanceEntry> resonance, IRandomSource randomSource, IReadOnlySet<DragonId>? excluded = null)
    {
        var entries = Calculate(resonance, excluded);
        var roll = randomSource.Next(entries.Sum(entry => entry.Weight));
        var cumulative = 0;

        foreach (var entry in entries)
        {
            cumulative += entry.Weight;
            if (roll < cumulative) return entry.Dragon;
        }

        return entries[^1].Dragon;
    }

    private static int Value(IReadOnlyList<RunResonanceEntry> resonance, SpellSchool school) => resonance.FirstOrDefault(entry => entry.School == school)?.Value ?? 0;
}
