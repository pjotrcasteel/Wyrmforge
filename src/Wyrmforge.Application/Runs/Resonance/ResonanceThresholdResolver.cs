using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Resonance;

public static class ResonanceThresholdResolver
{
    public static IReadOnlyList<ResonanceThresholdDefinition> Resolve(IReadOnlyList<RunResonanceEntry> resonance)
    {
        var values = resonance.ToDictionary(entry => entry.School, entry => entry.Value);
        return ResonanceThresholdCatalog.All.Where(definition => definition.Requirements.All(requirement => Value(values, requirement.School) >= requirement.MinimumValue)).ToArray();
    }

    private static int Value(IReadOnlyDictionary<SpellSchool, int> values, SpellSchool school) => values.GetValueOrDefault(school);
}
