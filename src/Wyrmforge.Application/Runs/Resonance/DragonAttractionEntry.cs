using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Runs.Resonance;

public sealed record DragonAttractionEntry(DragonId Dragon, int Weight, double Probability);
