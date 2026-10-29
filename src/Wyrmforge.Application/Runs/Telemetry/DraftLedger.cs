using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.Telemetry;

/// <summary>Which schools a draft card speaks for. Refinements are school-neutral; a synergy speaks for every school it fuses.</summary>
public static class ChoiceSchools
{
    public static IReadOnlyList<SpellSchool> Of(LevelChoice choice)
    {
        var separator = choice.Id.IndexOf(':');
        var key = separator < 0 ? string.Empty : choice.Id[(separator + 1)..];
        return choice.Kind switch
        {
            LevelChoiceKind.NewSpell or LevelChoiceKind.SpellUpgrade or LevelChoiceKind.SpellFocus when Enum.TryParse<SpellId>(key, out var spell) =>
                [SpellCatalog.Get(spell).School],
            LevelChoiceKind.Evolution when Enum.TryParse<SpellEvolutionId>(key, out var evolution) =>
                [SpellCatalog.Get(SpellEvolutionCatalog.Get(evolution).Spell).School],
            LevelChoiceKind.Synergy when Enum.TryParse<SynergyId>(key, out var synergy) =>
                SynergyCatalog.Get(synergy).RequiredSpells.Select(required => SpellCatalog.Get(required).School).Distinct().ToArray(),
            LevelChoiceKind.Rune when Enum.TryParse<RunUpgradeId>(key, out var rune) && RuneSchool(rune) is { } school => [school],
            LevelChoiceKind.SchoolPower when Enum.TryParse<SpellSchool>(key, out var power) => [power],
            _ => [],
        };
    }

    // Multicast changes projectile delivery in every school, not Arcane specifically.
    public static SpellSchool? RuneSchool(RunUpgradeId id) => id switch
    {
        RunUpgradeId.Quickening or RunUpgradeId.Fleetfoot or RunUpgradeId.ChainSpark or RunUpgradeId.StaticCharge => SpellSchool.Storm,
        RunUpgradeId.Vitality or RunUpgradeId.FrostTouch or RunUpgradeId.Bulwark => SpellSchool.Frost,
        RunUpgradeId.ArcaneEcho or RunUpgradeId.Velocity => SpellSchool.Arcane,
        RunUpgradeId.Emberbrand => SpellSchool.Fire,
        _ => null,
    };
}

public enum DraftRelation
{
    /// <summary>A card of the hunter's committed primary school.</summary>
    Primary,
    /// <summary>A card of another school (support magic, cross-school runes, the other half of a synergy).</summary>
    Other,
    /// <summary>School-neutral refinements.</summary>
    Neutral,
}

/// <summary>
/// Amendment §9: offer rate and pick rate are separate questions. <see cref="Offered"/> counts every card shown (including reroll
/// replacements), <see cref="Selected"/> counts picks, so the conditional pick rate is Selected / Offered.
/// </summary>
public sealed record DraftSchoolTally(SpellSchool? School, DraftRelation Relation, int Rounds, int Offered, int Selected, int RerolledAway, int RerolledIn)
{
    public double PickRate => Offered == 0 ? 0 : Selected / (double)Offered;
}

public sealed record DraftTelemetry(int Rounds, int MajorRounds, int Rerolls, int GildedOffered, int GildedSpent, IReadOnlyList<DraftSchoolTally> Schools)
{
    public static DraftTelemetry Empty { get; } = new(0, 0, 0, 0, 0, []);

    public DraftSchoolTally? For(SpellSchool school, DraftRelation relation) => Schools.FirstOrDefault(tally => tally.School == school && tally.Relation == relation);
}

/// <summary>Authoritative record of every reward round, fed only by the simulation's own draft, reroll and pick events.</summary>
public sealed class DraftLedger
{
    private readonly Dictionary<(SpellSchool?, DraftRelation), int[]> tallies = [];
    private int rounds;
    private int majorRounds;
    private int rerolls;

    public void Open(IReadOnlyList<LevelChoice> choices, SpellSchool primary, bool major)
    {
        if (choices.Count == 0) return;
        rounds++;
        if (major) majorRounds++;
        var seen = new HashSet<(SpellSchool?, DraftRelation)>();
        foreach (var choice in choices)
            foreach (var key in Keys(choice, primary))
            {
                Bump(key, 1);
                if (seen.Add(key)) Bump(key, 0);
            }
    }

    public void Reroll(LevelChoice replaced, LevelChoice replacement, SpellSchool primary)
    {
        rerolls++;
        foreach (var key in Keys(replaced, primary)) Bump(key, 3);
        foreach (var key in Keys(replacement, primary))
        {
            Bump(key, 1);
            Bump(key, 4);
        }
    }

    public void Select(LevelChoice choice, SpellSchool primary)
    {
        foreach (var key in Keys(choice, primary)) Bump(key, 2);
    }

    public DraftTelemetry Snapshot(FateweaveState fateweave) => new(rounds, majorRounds, rerolls, fateweave.GoldenOffered, fateweave.GoldenSpent,
        tallies.OrderBy(pair => pair.Key.Item1.HasValue ? (int)pair.Key.Item1.Value : 99).ThenBy(pair => pair.Key.Item2)
            .Select(pair => new DraftSchoolTally(pair.Key.Item1, pair.Key.Item2, pair.Value[0], pair.Value[1], pair.Value[2], pair.Value[3], pair.Value[4]))
            .ToArray());

    private void Bump((SpellSchool?, DraftRelation) key, int field)
    {
        if (!tallies.TryGetValue(key, out var values)) tallies[key] = values = new int[5];
        values[field]++;
    }

    private static IEnumerable<(SpellSchool?, DraftRelation)> Keys(LevelChoice choice, SpellSchool primary)
    {
        var schools = ChoiceSchools.Of(choice);
        if (schools.Count == 0) return [(null, DraftRelation.Neutral)];
        return schools.Select(school => ((SpellSchool?)school, school == primary ? DraftRelation.Primary : DraftRelation.Other));
    }
}