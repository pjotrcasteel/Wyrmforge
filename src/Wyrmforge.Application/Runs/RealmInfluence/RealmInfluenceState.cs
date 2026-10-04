using Wyrmforge.Application.Runs.Resonance;

namespace Wyrmforge.Application.Runs.RealmInfluence;

public sealed class RealmInfluenceState
{
    public IReadOnlyList<RealmInfluenceCue> Calculate(IReadOnlyList<DragonAttention> attention)
    {
        if (attention.Count == 0) return Array.Empty<RealmInfluenceCue>();
        return attention.SelectMany(CreateCues).ToArray();
    }

    private static IEnumerable<RealmInfluenceCue> CreateCues(DragonAttention attention)
    {
        var strength = (int)attention.Intensity / (double)(int)DragonAttentionIntensity.Imminent;
        foreach (var rule in RealmInfluenceCatalog.Get(attention.Dragon).Rules)
        {
            if ((int)attention.Intensity < (int)rule.MinimumIntensity) continue;
            yield return new RealmInfluenceCue(attention.Dragon, rule.Effect, strength);
        }
    }
}
