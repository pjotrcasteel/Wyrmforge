namespace Wyrmforge.Domain.Progression.Relics;

public sealed record RelicDefinition(RelicId Id, string Name, string Icon, RelicRarity Rarity, string Description, RelicModifiers Modifiers);
