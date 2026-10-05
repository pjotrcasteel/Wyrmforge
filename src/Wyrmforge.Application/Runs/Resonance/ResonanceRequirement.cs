using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Resonance;

public sealed record ResonanceRequirement(SpellSchool School, int MinimumValue);
