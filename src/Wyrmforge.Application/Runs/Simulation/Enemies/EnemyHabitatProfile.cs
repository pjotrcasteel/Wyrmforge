using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Relative rarity weights per habitat, from the first-hunt encounter brief (§4). A zero weight is the
/// introduction policy: that kind never appears in that habitat, not even as a director insert.
/// Kinds that have not shipped yet lend their weight to a same-role stand-in so habitat pressure stays
/// at its intended level: Priest (support) → Hollow; Slinger and Wraith (telegraphed harassers) → Mire Hound.
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
        };

    public static double Weight(WyrmrealmHabitat habitat, EnemyKind kind) =>
        Weights.TryGetValue(habitat, out var row) && row.TryGetValue(kind, out var weight) ? weight : 0;

    public static bool Allows(WyrmrealmHabitat habitat, EnemyKind kind) => Weight(habitat, kind) > 0;

    /// <summary>The habitat's most common resident; substitutes for a director insert the habitat does not host.</summary>
    public static EnemyKind Signature(WyrmrealmHabitat habitat) =>
        Weights[habitat].OrderByDescending(pair => pair.Value).ThenBy(pair => pair.Key).First().Key;

    public static EnemyKind Admit(WyrmrealmHabitat? habitat, EnemyKind kind) =>
        habitat is not { } local || Allows(local, kind) ? kind : Signature(local);

    private static IReadOnlyDictionary<EnemyKind, double> Row(double hollow = 0, double ashling = 0, double priest = 0, double slinger = 0,
        double hound = 0, double penitent = 0, double wraith = 0)
    {
        // Stand-ins until roster steps 2–4 add the Ash Priest, Ash Slinger and Drowned Wraith kinds.
        hollow += priest;
        hound += slinger + wraith;
        var row = new Dictionary<EnemyKind, double>();
        if (hollow > 0) row[EnemyKind.Hollow] = hollow;
        if (ashling > 0) row[EnemyKind.Ashling] = ashling;
        if (hound > 0) row[EnemyKind.MireHound] = hound;
        if (penitent > 0) row[EnemyKind.Penitent] = penitent;
        return row;
    }
}
