using Wyrmforge.Domain.Progression.Loot;

namespace Wyrmforge.Domain.Progression.Signature;

/// <summary>Hunt salvage; never represented as a Wyrm Essence. Append new ids only: saves store names.</summary>
public enum HuntMaterialId { EmberResidue, CharredScrap, Emberglass }

public sealed record HuntMaterialNeed(HuntMaterialId Material, int Required);

public static class HuntMaterialCatalog
{
    public static IReadOnlyList<HuntMaterialId> All { get; } = Enum.GetValues<HuntMaterialId>();

    public static string Name(HuntMaterialId id) => id switch
    {
        HuntMaterialId.EmberResidue => "Ember Residue",
        HuntMaterialId.CharredScrap => "Charred Scrap",
        HuntMaterialId.Emberglass => "Emberglass",
        _ => throw new ArgumentOutOfRangeException(nameof(id)),
    };

    public static string Source(HuntMaterialId id) => id switch
    {
        HuntMaterialId.EmberResidue => "Ashlings and Ash Slingers",
        HuntMaterialId.CharredScrap => "Break barrels and crates in Hunts",
        HuntMaterialId.Emberglass => "Elite Fire foes and reclaimed refuges, Fire Tier 2 and up",
        _ => throw new ArgumentOutOfRangeException(nameof(id)),
    };

    public static LootRarity Rarity(HuntMaterialId id) => id switch
    {
        HuntMaterialId.EmberResidue or HuntMaterialId.CharredScrap => LootRarity.Common,
        HuntMaterialId.Emberglass => LootRarity.Rare,
        _ => throw new ArgumentOutOfRangeException(nameof(id)),
    };

    // First intentionally modest form. Other candidate mutations remain unshipped.
    public static IReadOnlyList<HuntMaterialNeed> CinderNeedleRecipe { get; } =
        [new(HuntMaterialId.EmberResidue, 2), new(HuntMaterialId.CharredScrap, 2)];
}

public sealed class HuntMaterialSatchel
{
    private readonly List<HuntMaterialId> items = [];

    public IReadOnlyList<HuntMaterialId> Items => items.ToArray();
    public int Count(HuntMaterialId id) => items.Count(item => item == id);
    public void Store(HuntMaterialId id) => items.Add(id);
    public void Restore(IEnumerable<HuntMaterialId> saved)
    {
        ArgumentNullException.ThrowIfNull(saved);
        items.Clear();
        items.AddRange(saved);
    }

    public bool ConsumeRecipe(IReadOnlyList<HuntMaterialNeed> recipe)
    {
        if (recipe.Any(need => need.Required <= 0 || Count(need.Material) < need.Required)) return false;
        foreach (var need in recipe)
            for (var i = 0; i < need.Required; i++) items.Remove(need.Material);
        return true;
    }
}
