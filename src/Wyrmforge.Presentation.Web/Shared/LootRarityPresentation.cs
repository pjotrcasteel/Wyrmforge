using Wyrmforge.Domain.Progression.Loot;

namespace Wyrmforge.Presentation.Web.Shared;

/// <summary>Shared text and CSS hooks for persistent-loot rarity (Common, Rare, Epic, Legendary).</summary>
public static class LootRarityPresentation
{
    public static string Label(LootRarity rarity) => rarity switch
    {
        LootRarity.Common => "Common",
        LootRarity.Rare => "Rare",
        LootRarity.Epic => "Epic",
        LootRarity.Legendary => "Legendary",
        _ => "Common",
    };

    public static string Class(LootRarity rarity) => $"loot-rarity-{Label(rarity).ToLowerInvariant()}";
}
