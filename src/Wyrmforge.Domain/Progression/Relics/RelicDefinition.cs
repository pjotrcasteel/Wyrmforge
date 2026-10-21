using Wyrmforge.Domain.Progression.Loot;
using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.Relics;

public sealed record RelicDefinition(RelicId Id, string Name, string Icon, LootRarity Rarity, string Description, BuildModifierProfile Modifiers)
{
    public RelicBurstProfile? DefeatBurst { get; init; }
}
