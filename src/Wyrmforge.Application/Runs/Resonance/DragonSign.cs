using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Resonance;

public sealed record DragonSign(SpellSchool School, DragonSignIntensity Intensity, string Title, string Description);
