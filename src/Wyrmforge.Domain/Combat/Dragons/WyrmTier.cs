namespace Wyrmforge.Domain.Combat.Dragons;

/// <summary>
/// How far up the lineage a Wyrm stands. Each tier is physically larger than the last, so a godlike Wyrm reads as a different
/// order of creature at a glance (Monster Hunter's Elder Dragons, Shadow of the Colossus). Only <see cref="Wyrm"/> and
/// <see cref="Ascendant"/> are fought today; the higher tiers are reserved data contracts (amendment §7, <see cref="WyrmLineageCatalog"/>) and their names are
/// provisional until the product owner settles them.
/// </summary>
public enum WyrmTier
{
    Wyrm = 0,
    Ascendant = 1,
    Elder = 2,
    /// <summary>Amendment §7 lists Primordial between Elder and Divine. Never persisted, so the reorder is safe.</summary>
    Primordial = 3,
    Divine = 4,
}

public static class WyrmTierCatalog
{
    /// <summary>
    /// Body scale relative to the catalog Wyrm. The body is the hit area and drives the drawn sprite, so they always match.
    /// Tiers above Ascendant outgrow a phone-sized lair and will need the roaming lair camera before they ship.
    /// </summary>
    public static double SizeScale(WyrmTier tier) => tier switch
    {
        WyrmTier.Ascendant => 1.15,
        WyrmTier.Elder => 1.35,
        WyrmTier.Primordial => 1.48,
        WyrmTier.Divine => 1.6,
        _ => 1,
    };
}
