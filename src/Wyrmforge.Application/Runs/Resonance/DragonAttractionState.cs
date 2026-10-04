using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Resonance;

public sealed class DragonAttractionState
{
    public const int BaseWeight = 6;
    public const int MatchingResonanceWeight = 4;

    public IReadOnlyList<DragonAttractionEntry> Calculate(IReadOnlyList<RunResonanceEntry> resonance)
    {
        var ashfangWeight = BaseWeight + (Value(resonance, SpellSchool.Fire) * MatchingResonanceWeight);
        var stormcoilWeight = BaseWeight + (Value(resonance, SpellSchool.Storm) * MatchingResonanceWeight);
        var totalWeight = ashfangWeight + stormcoilWeight;

        return
        [
            new DragonAttractionEntry(DragonId.Ashfang, ashfangWeight, ashfangWeight / (double)totalWeight),
            new DragonAttractionEntry(DragonId.Stormcoil, stormcoilWeight, stormcoilWeight / (double)totalWeight),
        ];
    }

    public DragonId Roll(IReadOnlyList<RunResonanceEntry> resonance, IRandomSource randomSource)
    {
        var entries = Calculate(resonance);
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
