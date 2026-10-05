using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Forge;

public sealed record RunOfferingUnlock(DragonEssenceId EssenceId) : ForgeFeatureUnlock;
