using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Forge;

public sealed record ForgeMasteryDefinition(
    ForgeMasteryId Id,
    ForgeDiscoveryId Lineage,
    int Tier,
    string Name,
    string Description,
    DragonEssenceId Cost,
    ForgeMasteryId? Prerequisite,
    IReadOnlyList<ForgeFeatureUnlock> Unlocks);
