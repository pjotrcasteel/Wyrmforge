using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Rewards;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Relics;

public sealed class RelicChoiceService
{
    public const int ChoiceCount = 3;

    public IReadOnlyList<RelicDefinition> Roll(RelicInventoryState inventory, IRandomSource randomSource, IReadOnlySet<RelicId>? availableRelics = null, SpellSchool? preferredSchool = null)
    {
        var engine = new RewardChoiceEngine(randomSource);
        var pool = RelicCatalog.All
            .Where(definition => (availableRelics is null || availableRelics.Contains(definition.Id)) && !inventory.IsOwned(definition.Id)).ToList();
        var choices = new List<RelicDefinition>();
        // Offer distinct jobs before filling remaining slots; rarity never pushes all survival options out.
        foreach (var role in new[] { RelicRole.Power, RelicRole.Survival, RelicRole.Mobility })
        {
            var candidates = pool.Where(relic => Role(relic.Id) == role).ToArray();
            var relevant = role == RelicRole.Power ? candidates.FirstOrDefault(relic => MatchesSchool(relic.Id, preferredSchool)) : null;
            var selected = relevant ?? engine.Roll(candidates.Select(Candidate), 1).FirstOrDefault()?.Value;
            if (selected is null) continue;
            choices.Add(selected);
            pool.Remove(selected);
        }
        choices.AddRange(engine.Roll(pool.Select(Candidate), ChoiceCount - choices.Count).Select(candidate => candidate.Value));
        return choices;
    }

    private static RewardCandidate<RelicDefinition> Candidate(RelicDefinition relic) => new($"relic:{relic.Id}", relic, ToRewardRarity(relic.Rarity));

    private static bool MatchesSchool(RelicId id, SpellSchool? school) => (id, school) switch
    {
        (RelicId.EmberheartCharm, SpellSchool.Fire) or (RelicId.DuelistLens, SpellSchool.Frost) or (RelicId.ChronoglassShard, SpellSchool.Arcane)
            or (RelicId.Stormhook, SpellSchool.Storm) => true,
        _ => false,
    };

    public static RelicRole Role(RelicId id) => id switch
    {
        RelicId.Vitalstone or RelicId.IronbarkTotem => RelicRole.Survival,
        RelicId.GalefootSigil => RelicRole.Mobility,
        _ => RelicRole.Power,
    };

    private static RewardRarity ToRewardRarity(RelicRarity rarity) => rarity switch
    {
        RelicRarity.Common => RewardRarity.Common,
        RelicRarity.Rare => RewardRarity.Rare,
        RelicRarity.Legendary => RewardRarity.Legendary,
        _ => throw new ArgumentOutOfRangeException(nameof(rarity)),
    };
}
