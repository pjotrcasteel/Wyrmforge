namespace Wyrmforge.Domain.Progression.Forge;

public sealed record ForgeGoal(
    ForgeDiscoveryId Lineage,
    string Title,
    string Objective,
    string Reward,
    int Progress,
    int Required,
    bool ReadyToForge,
    int Priority);
