using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Combat.Dragons;

public enum WyrmTierAvailability
{
    /// <summary>Fought today.</summary>
    Hunted,
    /// <summary>A reserved data contract: not encounterable until its behaviour, arena and preparation are designed.</summary>
    Reserved,
}

public sealed record WyrmLineageTier(WyrmTier Tier, WyrmTierAvailability Availability);

/// <summary>
/// One bloodline per fundamental discipline (amendment §7). Higher forms must differ in behaviour, arena and preparation,
/// never only in numbers, so each tier is declared before any of its encounters exist. Epithets come from the owner's
/// concept sheets; the higher tier names stay provisional until approved.
/// </summary>
public sealed record WyrmLineage(DragonId Wyrm, SpellSchool School, string Epithet, IReadOnlyList<WyrmLineageTier> Tiers)
{
    public bool IsHunted(WyrmTier tier) => Tiers.Any(entry => entry.Tier == tier && entry.Availability == WyrmTierAvailability.Hunted);
}

public static class WyrmLineageCatalog
{
    private static readonly IReadOnlyList<WyrmLineageTier> CurrentTiers = Enum.GetValues<WyrmTier>()
        .Select(tier => new WyrmLineageTier(tier, tier <= WyrmTier.Ascendant ? WyrmTierAvailability.Hunted : WyrmTierAvailability.Reserved))
        .ToArray();

    public static IReadOnlyList<WyrmLineage> All { get; } =
    [
        new(DragonId.Ashfang, SpellSchool.Fire, "the Cinder Wyrm", CurrentTiers),
        new(DragonId.Rimeclaw, SpellSchool.Frost, "the Glacier Wyrm", CurrentTiers),
        new(DragonId.Stormcoil, SpellSchool.Storm, "the Tempest Wyrm", CurrentTiers),
        new(DragonId.Voidweaver, SpellSchool.Arcane, "the Aether Wyrm", CurrentTiers),
    ];

    public static WyrmLineage Get(DragonId wyrm) => All.Single(lineage => lineage.Wyrm == wyrm);

    public static WyrmLineage For(SpellSchool school) => All.Single(lineage => lineage.School == school);
}
