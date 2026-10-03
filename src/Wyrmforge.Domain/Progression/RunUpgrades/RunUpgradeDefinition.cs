namespace Wyrmforge.Domain.Progression.RunUpgrades;

public sealed record RunUpgradeDefinition(RunUpgradeId Id, string Name, string Description, string Icon, int MaxRank);
