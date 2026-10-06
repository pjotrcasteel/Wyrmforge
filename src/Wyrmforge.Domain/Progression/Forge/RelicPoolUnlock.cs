using Wyrmforge.Domain.Progression.Relics;

namespace Wyrmforge.Domain.Progression.Forge;

public sealed record RelicPoolUnlock(RelicId RelicId) : ForgeFeatureUnlock;
