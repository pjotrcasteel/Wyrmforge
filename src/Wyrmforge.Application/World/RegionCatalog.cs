using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.World;

namespace Wyrmforge.Application.World;

/// <summary>
/// The authored regions. Two are playable. The first hunt's land, where Ashfang's cinder marks the ground but all four
/// lineages answer a hunt's resonance (the behaviour hunts already had); Rimeclaw's frost opens after Ashfang falls. The other two are charted from the owner's concept
/// sheets (<c>user_handover_files/concepts/&lt;School&gt;</c>) so their discipline, lineage and roster are fixed before content.
/// </summary>
public static class RegionCatalog
{
    public static RegionId CinderFrontierId { get; } = new("cinder-frontier");
    public static RegionId FrostRegionId { get; } = new("glacier-region");
    public static RegionId StormRegionId { get; } = new("tempest-region");
    public static RegionId ArcaneRegionId { get; } = new("aether-region");

    public static RegionDefinition CinderFrontier { get; } = new(
        CinderFrontierId,
        "The Cinder Frontier",
        SpellSchool.Fire,
        RegionStatus.Playable,
        WyrmrealmHabitatCatalog.Fire,
        [EnemyKind.Hollow, EnemyKind.Ashling, EnemyKind.AshPriest, EnemyKind.AshSlinger, EnemyKind.MireHound, EnemyKind.Penitent,
            EnemyKind.DrownedWraith, EnemyKind.BellWarden, EnemyKind.Reliquary],
        ["The Hollow", "Ashlings", "Ash Priest", "Ash Slinger", "Mire Hound", "The Penitent", "Drowned Wraith", "Bell Warden",
            "The Reliquary", "Ashfang, the Cinder Wyrm"],
        Influence(DragonId.Ashfang, DragonId.Rimeclaw, DragonId.Stormcoil, DragonId.Voidweaver),
        RegionAccessRule.Open);

    /// <summary>
    /// Rimeclaw's land (frost roster F1-F4). Where the Cinder Frontier pressures, this region boxes the hunter in. It opens
    /// once Ashfang has fallen: the first Great Hunt is the gate out of the starting land. Stormcoil and Voidweaver still
    /// roam the ice; Ashfang's cinder does not reach it.
    /// </summary>
    public static RegionDefinition HoarfrostReaches { get; } = new(
        FrostRegionId,
        "The Hoarfrost Reaches",
        SpellSchool.Frost,
        RegionStatus.Playable,
        WyrmrealmHabitatCatalog.Frost,
        [EnemyKind.FrostlingPackling, EnemyKind.Shardcaster, EnemyKind.WhitefangStalker, EnemyKind.CairnSentinel,
            EnemyKind.HoarfrostCantor, EnemyKind.MirrorWisp, EnemyKind.BellOfWinter, EnemyKind.ReliquaryOfGlass],
        ["The Frostling Packling", "The Hoarfrost Cantor", "The Shardcaster", "The Whitefang Stalker", "The Cairn Sentinel",
            "The Mirror Wisp", "The Bell of Winter", "The Reliquary of Glass", "Rimeclaw, the Glacier Wyrm"],
        Influence(DragonId.Rimeclaw, DragonId.Stormcoil, DragonId.Voidweaver),
        new RegionAccessRule(RegionAccessKind.WyrmSlain, Wyrm: DragonId.Ashfang));

    public static IReadOnlyList<RegionDefinition> All { get; } =
    [
        CinderFrontier,
        HoarfrostReaches,
        Planned(StormRegionId, "Uncharted Storm region", SpellSchool.Storm, DragonId.Stormcoil,
            ["Spark Swarm", "Volt Hound", "Ion Leech", "Charge Sentinel", "Storm Razor", "Magnet Colossus", "The Conduit",
                "Stormcoil, the Tempest Wyrm"]),
        Planned(ArcaneRegionId, "Uncharted Arcane region", SpellSchool.Arcane, DragonId.Voidweaver,
            ["The Unwritten", "Quillmaws", "Knotmother", "The Orrery", "Seamwalker", "The Bound Column", "Echo Marionette",
                "Weightbearer", "Spell Leech", "The Astral Gaoler", "The Last Cartographer", "Voidweaver, the Aether Wyrm"]),
    ];

    /// <summary>Where every hunter begins, whether through the campaign or free exploration.</summary>
    public static RegionDefinition Starting => CinderFrontier;

    public static RegionDefinition Get(RegionId id) => All.Single(region => region.Id == id);

    public static RegionDefinition? Find(RegionId id) => All.SingleOrDefault(region => region.Id == id);

    private static RegionDefinition Planned(RegionId id, string name, SpellSchool school, DragonId home, IReadOnlyList<string> concepts) =>
        new(id, name, school, RegionStatus.Planned, [], [], concepts, Influence(home), RegionAccessRule.NotYetAuthored);

    private static Dictionary<DragonId, WyrmInfluence> Influence(DragonId home, params DragonId[] present)
    {
        var influence = present.ToDictionary(wyrm => wyrm, _ => WyrmInfluence.Present);
        influence[home] = WyrmInfluence.Home;
        return influence;
    }
}
