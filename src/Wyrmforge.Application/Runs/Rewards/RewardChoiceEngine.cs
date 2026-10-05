using Wyrmforge.Application.Abstractions.Randomness;

namespace Wyrmforge.Application.Runs.Rewards;

public sealed class RewardChoiceEngine(IRandomSource randomSource)
{
    private static readonly IReadOnlyDictionary<RewardRarity, double> RarityWeights = new Dictionary<RewardRarity, double>
    {
        [RewardRarity.Common] = 1,
        [RewardRarity.Uncommon] = 0.65,
        [RewardRarity.Rare] = 0.35,
        [RewardRarity.Legendary] = 0.12,
    };

    public IReadOnlyList<RewardCandidate<T>> Roll<T>(IEnumerable<RewardCandidate<T>> candidates, int count, IReadOnlySet<string>? excludedIds = null)
    {
        if (count <= 0) return Array.Empty<RewardCandidate<T>>();
        var pool = candidates.Where(candidate => candidate.Weight > 0 && excludedIds?.Contains(candidate.Id) != true).ToList();
        var duplicateId = pool.GroupBy(candidate => candidate.Id).FirstOrDefault(group => group.Count() > 1)?.Key;
        if (duplicateId is not null) throw new InvalidOperationException($"Reward candidate id '{duplicateId}' is duplicated.");

        var result = new List<RewardCandidate<T>>(Math.Min(count, pool.Count));
        while (result.Count < count && pool.Count > 0)
        {
            var selected = TakeWeighted(pool);
            result.Add(selected);
            pool.Remove(selected);
        }
        return result;
    }

    private RewardCandidate<T> TakeWeighted<T>(IReadOnlyList<RewardCandidate<T>> candidates)
    {
        var totalWeight = candidates.Sum(EffectiveWeight);
        var roll = randomSource.NextDouble() * totalWeight;
        var cumulative = 0d;
        foreach (var candidate in candidates)
        {
            cumulative += EffectiveWeight(candidate);
            if (roll < cumulative) return candidate;
        }
        return candidates[^1];
    }

    private static double EffectiveWeight<T>(RewardCandidate<T> candidate) => candidate.Weight * RarityWeights[candidate.Rarity];
}
