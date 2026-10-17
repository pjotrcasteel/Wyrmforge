using Wyrmforge.Application.Runs.Rewards;

namespace Wyrmforge.Application.Runs.LevelUp;

public sealed record LevelChoice(
    string Id,
    LevelChoiceKind Kind,
    string Name,
    string Description,
    string Icon,
    int CurrentRank,
    int MaxRank,
    RewardRarity Rarity = RewardRarity.Common,
    LevelChoiceDraftRole Role = LevelChoiceDraftRole.Reinforce,
    string? Hint = null)
{
    /// <summary>
    /// Won through a Gilded Fateweave. A gilded refinement grants <see cref="GildedRefinementRanks"/> ranks at once; a gilded major
    /// card is simply a higher-rarity card from the same legal milestone pool and needs no special handling.
    /// </summary>
    public bool Gilded { get; init; }

    public const int GildedRefinementRanks = 2;

    /// <summary>Ranks this card grants when chosen.</summary>
    public int RankStep => Gilded && Kind == LevelChoiceKind.Refinement ? GildedRefinementRanks : 1;
}
