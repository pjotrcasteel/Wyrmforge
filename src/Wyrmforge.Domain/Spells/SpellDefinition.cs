namespace Wyrmforge.Domain.Spells;

public sealed record SpellDefinition(SpellId Id, string Name, string Description, string Icon, SpellSchool School, int MaxRank);
