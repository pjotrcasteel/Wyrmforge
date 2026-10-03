namespace Wyrmforge.Domain.Spells.Synergies;

public sealed record SynergyDefinition(SynergyId Id, string Name, string Description, string Icon, IReadOnlyList<SpellId> RequiredSpells);
