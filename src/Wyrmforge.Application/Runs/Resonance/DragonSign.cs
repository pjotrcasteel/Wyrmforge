using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Resonance;

public sealed record DragonSign(DragonId Dragon, SpellSchool School, DragonAttentionIntensity Intensity, string Title, string Description);
