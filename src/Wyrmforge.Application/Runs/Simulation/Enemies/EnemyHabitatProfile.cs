using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Relative rarity weights per habitat, from the first-hunt encounter brief (§4). A zero weight is the
/// introduction policy: that kind never appears in that habitat, not even as a director insert.
/// </summary>
public static class EnemyHabitatProfile
{
    private static readonly IReadOnlyDictionary<WyrmrealmHabitat, IReadOnlyDictionary<EnemyKind, double>> Weights =
        new Dictionary<WyrmrealmHabitat, IReadOnlyDictionary<EnemyKind, double>>
        {
            [WyrmrealmHabitat.Outskirts] = Row(hollow: 100),
            [WyrmrealmHabitat.WetForest] = Row(hollow: 20, ashling: 15, priest: 2, slinger: 3, hound: 55, wraith: 5),
            [WyrmrealmHabitat.OpenField] = Row(hollow: 12, ashling: 48, priest: 8, slinger: 20, hound: 12),
            [WyrmrealmHabitat.DesertedVillage] = Row(hollow: 45, ashling: 22, priest: 8, slinger: 7, hound: 8, penitent: 10),
            [WyrmrealmHabitat.MonasteryGrounds] = Row(hollow: 22, ashling: 15, priest: 9, slinger: 6, hound: 2, penitent: 36, wraith: 10),
            [WyrmrealmHabitat.FloodedCloister] = Row(hollow: 20, ashling: 5, priest: 4, slinger: 2, hound: 4, penitent: 20, wraith: 45),
            [WyrmrealmHabitat.ScorchedApproach] = Row(hollow: 15, ashling: 33, priest: 11, slinger: 15, hound: 9, penitent: 14, wraith: 3),
            [WyrmrealmHabitat.Lair] = Row(hollow: 15, ashling: 33, priest: 11, slinger: 15, hound: 9, penitent: 14, wraith: 3),
            // Rimeclaw's region (Frost F4): the Packling litter is the constant, as the Hollow is in the first region; each
            // habitat adds the one Frost role it teaches — flankers in the pines, casters on the plain, the choir in the hamlet,
            // the cairn wall at the barrows, reflections on the mere.
            [WyrmrealmHabitat.FrozenRoad] = Row(packling: 100),
            [WyrmrealmHabitat.SnowboundPines] = Row(packling: 35, whitefang: 50, shardcaster: 8, cantor: 4, wisp: 3),
            [WyrmrealmHabitat.WhiteoutPlain] = Row(packling: 45, shardcaster: 30, whitefang: 12, cantor: 8, cairn: 5),
            [WyrmrealmHabitat.BuriedHamlet] = Row(packling: 40, cantor: 20, shardcaster: 16, cairn: 12, whitefang: 8, wisp: 4),
            [WyrmrealmHabitat.CairnBarrows] = Row(packling: 28, cairn: 34, cantor: 16, shardcaster: 10, whitefang: 4, wisp: 8),
            [WyrmrealmHabitat.MirrorMere] = Row(packling: 30, wisp: 34, shardcaster: 16, cairn: 10, cantor: 6, whitefang: 4),
            [WyrmrealmHabitat.GlacierApproach] = Row(packling: 32, shardcaster: 18, whitefang: 14, cairn: 12, cantor: 12, wisp: 12),
            [WyrmrealmHabitat.GlacierLair] = Row(packling: 32, shardcaster: 18, whitefang: 14, cairn: 12, cantor: 12, wisp: 12),
        };

    public static double Weight(WyrmrealmHabitat habitat, EnemyKind kind) =>
        Weights.TryGetValue(habitat, out var row) && row.TryGetValue(kind, out var weight) ? weight : 0;

    public static bool Allows(WyrmrealmHabitat habitat, EnemyKind kind) => Weight(habitat, kind) > 0;

    /// <summary>The habitat's most common resident; substitutes for a director insert the habitat does not host.</summary>
    public static EnemyKind Signature(WyrmrealmHabitat habitat) =>
        Weights[habitat].OrderByDescending(pair => pair.Value).ThenBy(pair => pair.Key).First().Key;

    public static EnemyKind Admit(WyrmrealmHabitat? habitat, EnemyKind kind)
    {
        if (habitat is not { } local || Allows(local, kind)) return kind;
        // The director asks for a role (a shield, a flanker); a Frost habitat answers with its own creature in that role.
        var counterpart = Counterpart(local, kind);
        return Allows(local, counterpart) ? counterpart : Signature(local);
    }

    /// <summary>The same combat role in the habitat's region: Penitent → Cairn Sentinel, Mire Hound → Whitefang Stalker, and so on.</summary>
    public static EnemyKind Counterpart(WyrmrealmHabitat habitat, EnemyKind kind) =>
        WyrmrealmHabitatCatalog.School(habitat) != Domain.Spells.SpellSchool.Frost ? kind : kind switch
        {
            EnemyKind.Hollow or EnemyKind.Ashling => EnemyKind.FrostlingPackling,
            EnemyKind.MireHound => EnemyKind.WhitefangStalker,
            EnemyKind.Penitent => EnemyKind.CairnSentinel,
            EnemyKind.AshSlinger => EnemyKind.Shardcaster,
            EnemyKind.AshPriest => EnemyKind.HoarfrostCantor,
            EnemyKind.DrownedWraith => EnemyKind.MirrorWisp,
            _ => kind,
        };

    private static IReadOnlyDictionary<EnemyKind, double> Row(double hollow = 0, double ashling = 0, double priest = 0, double slinger = 0,
        double hound = 0, double penitent = 0, double wraith = 0, double packling = 0, double shardcaster = 0, double whitefang = 0,
        double cairn = 0, double cantor = 0, double wisp = 0)
    {
        var row = new Dictionary<EnemyKind, double>();
        if (hollow > 0) row[EnemyKind.Hollow] = hollow;
        if (ashling > 0) row[EnemyKind.Ashling] = ashling;
        if (hound > 0) row[EnemyKind.MireHound] = hound;
        if (penitent > 0) row[EnemyKind.Penitent] = penitent;
        if (slinger > 0) row[EnemyKind.AshSlinger] = slinger;
        if (priest > 0) row[EnemyKind.AshPriest] = priest;
        if (wraith > 0) row[EnemyKind.DrownedWraith] = wraith;
        if (packling > 0) row[EnemyKind.FrostlingPackling] = packling;
        if (shardcaster > 0) row[EnemyKind.Shardcaster] = shardcaster;
        if (whitefang > 0) row[EnemyKind.WhitefangStalker] = whitefang;
        if (cairn > 0) row[EnemyKind.CairnSentinel] = cairn;
        if (cantor > 0) row[EnemyKind.HoarfrostCantor] = cantor;
        if (wisp > 0) row[EnemyKind.MirrorWisp] = wisp;
        return row;
    }
}
