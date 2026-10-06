using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Progression.Forge;

public sealed record SpellPoolUnlock(SpellId SpellId) : ForgeFeatureUnlock;
