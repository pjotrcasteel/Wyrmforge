namespace Wyrmforge.Domain.Spells.Evolutions;

public sealed record SpellEvolutionDefinition(
    SpellEvolutionId Id,
    SpellId Spell,
    string Name,
    string Description,
    string Icon,
    SpellEvolutionProfile Profile);
