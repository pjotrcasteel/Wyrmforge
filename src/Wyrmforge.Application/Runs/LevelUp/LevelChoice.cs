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
    string? Hint = null);
