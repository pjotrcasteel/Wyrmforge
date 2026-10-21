using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Domain.Progression.Loot;

/// <summary>Shared rarity for persistent loot: Hunt materials, relics and Wyrm Essences. In-run level-up drafts keep their own scale.</summary>
public enum LootRarity
{
    Common = 1,
    Rare = 2,
    Epic = 3,
    Legendary = 4,
}

/// <summary>
/// Hunt tier decides how rare ordinary drops may be (I Common, II Rare, III Epic, IV–V Legendary).
/// The tier's Wyrm Essence sits one step above that cap, so the target always out-ranks the trail.
/// </summary>
public static class LootRarityRules
{
    public static LootRarity DropCap(WyrmTier tier) => tier switch
    {
        WyrmTier.Wyrm => LootRarity.Common,
        WyrmTier.Ascendant => LootRarity.Rare,
        WyrmTier.Elder => LootRarity.Epic,
        _ => LootRarity.Legendary,
    };

    public static bool CanDrop(LootRarity rarity, WyrmTier tier) => rarity <= DropCap(tier);

    public static LootRarity Essence(WyrmTier tier) => DropCap(tier) == LootRarity.Legendary ? LootRarity.Legendary : DropCap(tier) + 1;
}
