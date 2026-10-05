namespace Wyrmforge.Application.Runs.Rewards;

public sealed record RewardCandidate<T>(string Id, T Value, RewardRarity Rarity = RewardRarity.Common, double Weight = 1);
