namespace Wyrmforge.Domain.Progression.Forge;

public sealed record ForgeDiscoveryDefinition(
    ForgeDiscoveryId Id,
    string Name,
    string Description,
    ForgeDiscoveryRequirement Requirement,
    IReadOnlyList<ForgeFeatureUnlock> Unlocks);
