using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Resonance;

namespace Wyrmforge.Application.Runs.RealmInfluence;

public sealed class RealmInfluenceState
{
    public IReadOnlyList<RealmInfluenceCue> Calculate(IReadOnlyList<DragonAttention> attention)
    {
        if (attention.Count == 0) return Array.Empty<RealmInfluenceCue>();
        return attention.SelectMany(CreateCues).ToArray();
    }

    public IReadOnlyList<WyrmrealmEncounterModifier> CalculateEncounterModifiers(IReadOnlyList<DragonAttention> attention)
    {
        if (attention.Count == 0) return Array.Empty<WyrmrealmEncounterModifier>();
        return attention.SelectMany(CreateEncounterModifiers).ToArray();
    }

    private static IEnumerable<RealmInfluenceCue> CreateCues(DragonAttention attention)
    {
        var strength = (int)attention.Intensity / (double)(int)DragonAttentionIntensity.Imminent;
        foreach (var rule in ActiveRules(attention)) yield return new RealmInfluenceCue(attention.Dragon, rule.Effect, strength);
    }

    private static IEnumerable<WyrmrealmEncounterModifier> CreateEncounterModifiers(DragonAttention attention)
    {
        foreach (var rule in ActiveRules(attention))
        {
            if (rule.EncounterModifier is { } modifier) yield return modifier;
        }
    }

    private static IEnumerable<RealmInfluenceRule> ActiveRules(DragonAttention attention) => RealmInfluenceCatalog.Get(attention.Dragon).Rules
        .Where(rule => (int)attention.Intensity >= (int)rule.MinimumIntensity);
}
