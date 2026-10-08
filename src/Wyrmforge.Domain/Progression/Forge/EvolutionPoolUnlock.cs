using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Domain.Progression.Forge;

public sealed record EvolutionPoolUnlock(SpellEvolutionId EvolutionId) : ForgeFeatureUnlock;
