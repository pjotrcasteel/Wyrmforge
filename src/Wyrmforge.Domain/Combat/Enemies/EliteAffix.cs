namespace Wyrmforge.Domain.Combat.Enemies;

/// <summary>
/// Roster step 5 (encounter brief §7): an elite is an ordinary enemy wearing one readable power, never a copied catalog entry.
/// Like a Diablo champion or a Hades armored foe, the base silhouette and counterplay stay; only one rule is sharpened.
/// </summary>
public enum EliteAffix
{
    None,
    Gravebound,
    Packblood,
    EmberAnointer,
    CinderMarksman,
    Thornrunner,
    Oathshield,
    Drowncaller,
    // Frost (F4). Each sharpens what the base enemy already does to box the hunter in; none borrows a Fire champion's rule.
    Rimehowl,
    Splinterwright,
    Twinfang,
    Barrowlord,
    Choirwarden,
    Thousandface,
}

public sealed record EliteAffixDefinition(EliteAffix Affix, EnemyKind Kind, string Title, string Detail, double HealthMultiplier, double ImpactMultiplier);

public static class EliteAffixCatalog
{
    /// <summary>Experience multiplier: visible but restrained, so hunting elites never beats clearing the node.</summary>
    public const double ExperienceMultiplier = 2.5;

    public static IReadOnlyList<EliteAffixDefinition> All { get; } =
    [
        new(EliteAffix.Gravebound, EnemyKind.Hollow, "Gravebound Hollow", "Its corpse erupts. Step out of the ring when it falls.", 1.5, 1.15),
        new(EliteAffix.Packblood, EnemyKind.Ashling, "Packblood Ashling", "Nearby Ashlings run faster and never rout. Kill it first.", 1.6, 1.1),
        new(EliteAffix.EmberAnointer, EnemyKind.AshPriest, "Ember Anointer", "Its heal restores far more. Interrupt the tether.", 1.4, 1.1),
        new(EliteAffix.CinderMarksman, EnemyKind.AshSlinger, "Cinder Marksman", "Throws two embers per volley. Read both marks.", 1.4, 1.15),
        new(EliteAffix.Thornrunner, EnemyKind.MireHound, "Thornrunner", "Switches flank once more before it lunges.", 1.45, 1.2),
        new(EliteAffix.Oathshield, EnemyKind.Penitent, "Oathshield Penitent", "Its shield blocks almost everything. Flank it or break it.", 1.35, 1.1),
        new(EliteAffix.Drowncaller, EnemyKind.DrownedWraith, "Drowncaller", "Its strike echoes. Leave the ripple afterwards.", 1.45, 1.2),
        new(EliteAffix.Rimehowl, EnemyKind.FrostlingPackling, "Rimehowl Packling", "Its bite freezes deep. Never let it reach you cold.", 1.5, 1.1),
        new(EliteAffix.Splinterwright, EnemyKind.Shardcaster, "Splinterwright", "Its lance seeds splinters along the whole lane. Leave the line, not just the end.", 1.4, 1.1),
        new(EliteAffix.Twinfang, EnemyKind.WhitefangStalker, "Twinfang", "It leaps twice. Hold your dodge for the second crouch.", 1.4, 1.15),
        new(EliteAffix.Barrowlord, EnemyKind.CairnSentinel, "Barrowlord", "Its stamp rolls a second avalanche. Stay beside it.", 1.35, 1.1),
        new(EliteAffix.Choirwarden, EnemyKind.HoarfrostCantor, "Choirwarden", "Its hymn reaches the whole pack. Break the chant early.", 1.4, 1.1),
        new(EliteAffix.Thousandface, EnemyKind.MirrorWisp, "Thousandface", "Each glass step leaves two doubles. Find the one that moves.", 1.4, 1.15),
    ];

    public static EliteAffixDefinition For(EnemyKind kind) => All.Single(definition => definition.Kind == kind);

    /// <summary>The elite form of a common kind, or null for kinds that never roll elite (the Reliquary and its wards).</summary>
    public static EliteAffixDefinition? TryFor(EnemyKind kind) => All.SingleOrDefault(definition => definition.Kind == kind);

    public static EliteAffixDefinition Get(EliteAffix affix) => All.Single(definition => definition.Affix == affix);
}
