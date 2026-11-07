using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Loot;
using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Application.Runs.Hunts;

/// <summary>The actual source of a persistent material; the Hunt's tier alone never creates a drop.</summary>
public enum HuntLootSource
{
    Ashling,
    AshSlinger,
    EliteEnemy,
    Barrel,
    Crate,
    OptionalCache,
    ReclaimedRefuge,
}

/// <summary>Rolls are reproducible without consuming the simulation's combat random stream.</summary>
public enum HuntLootRollKind { Guaranteed, StableEnemyInterval, ExistingSiteSeedRoll }

/// <summary>Versioned, source-specific persistent salvage rule, not an in-Hunt upgrade-card probability.</summary>
public sealed record HuntLootRule(
    HuntLootSource Source,
    HuntMaterialId Material,
    HuntLootRollKind Roll = HuntLootRollKind.Guaranteed,
    int Interval = 1,
    double Chance = 1.0)
{
    public bool Pays(int sourceId, double? siteRoll = null) => Roll switch
    {
        HuntLootRollKind.Guaranteed => true,
        HuntLootRollKind.StableEnemyInterval => sourceId >= 0 && Interval > 0 && sourceId % Interval == 0,
        HuntLootRollKind.ExistingSiteSeedRoll => siteRoll is >= 0 and < 1 && siteRoll < Chance,
        _ => false,
    };
}

/// <summary>Authoritative material eligibility for one authored lineage and tier.</summary>
public sealed class HuntLootTable
{
    public const int CurrentVersion = 1;

    public HuntSelection Hunt { get; }
    public int Version => CurrentVersion;
    public IReadOnlyList<HuntLootRule> Rules { get; }
    public LootRarity BossEssenceRarity => LootRarityRules.Essence(Hunt.Tier);
    public IReadOnlyList<DragonEssenceId> BossEssenceChoices => DragonEssenceCatalog.ChoicesFor(Hunt.Target).Select(choice => choice.Id).ToArray();

    internal HuntLootTable(HuntSelection hunt, params HuntLootRule[] rules)
    {
        Hunt = hunt;
        Rules = Array.AsReadOnly(rules);
        if (rules.Any(rule => !CanDrop(rule.Material) || rule.Interval <= 0 || !double.IsFinite(rule.Chance) || rule.Chance is < 0 or > 1) ||
            rules.Select(rule => (rule.Source, rule.Material)).Distinct().Count() != rules.Length)
            throw new ArgumentException("Hunt loot rules must be valid, unique and within the tier rarity ceiling.");
    }

    public bool CanDrop(LootRarity rarity) => LootRarityRules.CanDrop(rarity, Hunt.Tier);

    public bool CanDrop(HuntMaterialId material) => CanDrop(HuntMaterialCatalog.Rarity(material));

    /// <summary>Evaluate a real kill, prop, site or earned refuge once; collecting and extraction remain separate.</summary>
    public IReadOnlyList<HuntMaterialId> MaterialsFor(HuntLootSource source, int sourceId = 0, double? siteRoll = null) =>
        Rules.Where(rule => rule.Source == source && rule.Pays(sourceId, siteRoll)).Select(rule => rule.Material).ToArray();
}

/// <summary>
/// Fire I–III are authored. IV/V and other lineages have no invented tables or inventory items until their Hunts exist.
/// The rules intentionally reproduce current material availability and rates; balancing is a separate owner milestone.
/// </summary>
public static class HuntLootCatalog
{
    private static readonly HuntLootRule AshlingResidue = new(HuntLootSource.Ashling, HuntMaterialId.EmberResidue,
        HuntLootRollKind.StableEnemyInterval, Interval: 3);
    private static readonly HuntLootRule SlingerResidue = new(HuntLootSource.AshSlinger, HuntMaterialId.EmberResidue,
        HuntLootRollKind.StableEnemyInterval, Interval: 3);
    private static readonly HuntLootRule BarrelScrap = new(HuntLootSource.Barrel, HuntMaterialId.CharredScrap);
    private static readonly HuntLootRule CrateScrap = new(HuntLootSource.Crate, HuntMaterialId.CharredScrap);
    private static readonly HuntLootRule CacheScrap = new(HuntLootSource.OptionalCache, HuntMaterialId.CharredScrap,
        HuntLootRollKind.ExistingSiteSeedRoll, Chance: .43);
    private static readonly HuntLootRule EliteEmberglass = new(HuntLootSource.EliteEnemy, HuntMaterialId.Emberglass);
    private static readonly HuntLootRule EliteWyrmcinder = new(HuntLootSource.EliteEnemy, HuntMaterialId.Wyrmcinder);
    private static readonly HuntLootRule RefugeEmberglass = new(HuntLootSource.ReclaimedRefuge, HuntMaterialId.Emberglass);

    public static HuntLootTable FireTierOne { get; } = new(HuntSelection.FireTierOne,
        AshlingResidue, SlingerResidue, BarrelScrap, CrateScrap, CacheScrap);

    public static HuntLootTable FireTierTwo { get; } = new(HuntSelection.FireTierTwo,
        AshlingResidue, SlingerResidue, BarrelScrap, CrateScrap, CacheScrap, EliteEmberglass, RefugeEmberglass);

    public static HuntLootTable FireTierThree { get; } = new(HuntSelection.FireTierThree,
        AshlingResidue, SlingerResidue, BarrelScrap, CrateScrap, CacheScrap, EliteEmberglass, EliteWyrmcinder, RefugeEmberglass);

    /// <summary>Untiered historical Hunts retain Common Fire salvage, without receiving Tier-II+ sources.</summary>
    public static HuntLootTable For(HuntSelection? hunt)
    {
        if (hunt is null) return FireTierOne;
        hunt.Validate();
        return hunt.Tier switch
        {
            WyrmTier.Wyrm => FireTierOne,
            WyrmTier.Ascendant => FireTierTwo,
            WyrmTier.Elder => FireTierThree,
            _ => throw new ArgumentOutOfRangeException(nameof(hunt), "This Hunt tier has no authored loot table."),
        };
    }
}
