using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Rewards;
using Wyrmforge.Domain.Progression.Relics;

namespace Wyrmforge.Application.Runs.Relics;

public sealed class RelicChoiceService
{
    public const int ChoiceCount = 3;

    public IReadOnlyList<RelicDefinition> Roll(RelicInventoryState inventory, IRandomSource randomSource)
    {
        var engine = new RewardChoiceEngine(randomSource);
        var candidates = RelicCatalog.All
            .Where(definition => !inventory.IsOwned(definition.Id))
            .Select(definition => new RewardCandidate<RelicDefinition>($"relic:{definition.Id}", definition, ToRewardRarity(definition.Rarity)));
        return engine.Roll(candidates, ChoiceCount).Select(candidate => candidate.Value).ToArray();
    }

    private static RewardRarity ToRewardRarity(RelicRarity rarity) => rarity switch
    {
        RelicRarity.Common => RewardRarity.Common,
        RelicRarity.Rare => RewardRarity.Rare,
        RelicRarity.Legendary => RewardRarity.Legendary,
        _ => throw new ArgumentOutOfRangeException(nameof(rarity)),
    };
}
