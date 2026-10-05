using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Application.Runs.Rewards;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.LevelUp;

public sealed class LevelChoiceService(IRandomSource randomSource)
{
    private const double SpellResonanceWeightPerPoint = 0.04;
    private const double SynergyResonanceWeightPerPoint = 0.03;
    private readonly RewardChoiceEngine rewardChoiceEngine = new(randomSource);

    public IReadOnlyList<LevelChoice> Roll(RunBuildState build, int count = 3) => RollInternal(build, null, null, count);

    public IReadOnlyList<LevelChoice> Roll(RunBuildState build, SpellSchool preferredSchool, int count = 3) => RollInternal(build, preferredSchool, null, count);

    public IReadOnlyList<LevelChoice> Roll(RunBuildState build, IReadOnlyList<RunResonanceEntry> resonance, int count = 3) => RollInternal(build, null, resonance, count);

    public IReadOnlyList<LevelChoice> Roll(RunBuildState build, SpellSchool preferredSchool, IReadOnlyList<RunResonanceEntry> resonance, int count = 3) =>
        RollInternal(build, preferredSchool, resonance, count);

    public bool Apply(RunBuildState build, LevelChoice choice)
    {
        if (choice.Id.StartsWith("rune:", StringComparison.Ordinal)) return build.RunUpgrades.Apply(ParseRunUpgrade(choice.Id));
        if (choice.Id.StartsWith("spell:", StringComparison.Ordinal)) return build.Spells.LearnOrUpgrade(ParseSpell(choice.Id));
        if (choice.Id.StartsWith("synergy:", StringComparison.Ordinal)) return build.Synergies.Select(ParseSynergy(choice.Id), build.Spells);
        return false;
    }

    private IReadOnlyList<LevelChoice> RollInternal(RunBuildState build, SpellSchool? preferredSchool, IReadOnlyList<RunResonanceEntry>? resonance, int count)
    {
        var pool = CreatePool(build);
        var choices = new List<LevelChoice>();

        var synergies = pool.Where(choice => choice.Kind == LevelChoiceKind.Synergy).ToList();
        if (synergies.Count > 0)
        {
            choices.Add(TakeReward(synergies, resonance));
        }
        else if (build.Spells.LearnedCount < 2)
        {
            var newSpells = pool.Where(choice => choice.Kind == LevelChoiceKind.NewSpell).ToList();
            if (newSpells.Count > 0) choices.Add(TakeReward(newSpells, resonance));
        }

        var used = choices.Select(choice => choice.Id).ToHashSet();
        if (preferredSchool is { } school && choices.Count < count)
        {
            var preferredChoices = pool.Where(choice => !used.Contains(choice.Id) && IsSpellChoiceForSchool(choice, school)).ToList();
            if (preferredChoices.Count > 0)
            {
                var preferred = TakeReward(preferredChoices, resonance);
                choices.Add(preferred);
                used.Add(preferred.Id);
            }
        }

        var remainder = pool.Where(choice => !used.Contains(choice.Id)).ToList();
        while (remainder.Count > 0 && choices.Count < count) choices.Add(TakeReward(remainder, resonance));
        return choices;
    }

    private static List<LevelChoice> CreatePool(RunBuildState build)
    {
        var choices = new List<LevelChoice>();
        choices.AddRange(RunUpgradeCatalog.All
            .Where(upgrade => build.RunUpgrades[upgrade.Id] < upgrade.MaxRank)
            .Select(upgrade => new LevelChoice($"rune:{upgrade.Id}", LevelChoiceKind.Rune, upgrade.Name, upgrade.Description, upgrade.Icon, build.RunUpgrades[upgrade.Id], upgrade.MaxRank)));
        choices.AddRange(SpellCatalog.All
            .Where(spell => build.Spells[spell.Id] < spell.MaxRank)
            .Select(spell => new LevelChoice($"spell:{spell.Id}", build.Spells[spell.Id] == 0 ? LevelChoiceKind.NewSpell : LevelChoiceKind.SpellUpgrade, spell.Name, spell.Description, spell.Icon, build.Spells[spell.Id], spell.MaxRank)));
        choices.AddRange(SynergyCatalog.All
            .Where(synergy => build.Synergies.IsAvailable(synergy.Id, build.Spells))
            .Select(synergy => new LevelChoice($"synergy:{synergy.Id}", LevelChoiceKind.Synergy, synergy.Name, synergy.Description, synergy.Icon, 0, 1)));
        return choices;
    }

    private static bool IsSpellChoiceForSchool(LevelChoice choice, SpellSchool school) =>
        choice.Id.StartsWith("spell:", StringComparison.Ordinal) && SpellCatalog.Get(ParseSpell(choice.Id)).School == school;

    private LevelChoice TakeReward(List<LevelChoice> choices, IReadOnlyList<RunResonanceEntry>? resonance)
    {
        var candidates = choices.Select(choice => new RewardCandidate<LevelChoice>(choice.Id, choice, Weight: CalculateWeight(choice, resonance)));
        var selected = rewardChoiceEngine.Roll(candidates, 1).Single().Value;
        choices.RemoveAll(choice => choice.Id == selected.Id);
        return selected;
    }

    private static double CalculateWeight(LevelChoice choice, IReadOnlyList<RunResonanceEntry>? resonance)
    {
        if (resonance is null) return 1;
        if (choice.Id.StartsWith("spell:", StringComparison.Ordinal))
        {
            var school = SpellCatalog.Get(ParseSpell(choice.Id)).School;
            return 1 + ResonanceValue(resonance, school) * SpellResonanceWeightPerPoint;
        }
        if (!choice.Id.StartsWith("synergy:", StringComparison.Ordinal)) return 1;
        var synergy = SynergyCatalog.Get(ParseSynergy(choice.Id));
        var schools = synergy.RequiredSpells.Select(id => SpellCatalog.Get(id).School).Distinct().ToArray();
        return 1 + schools.Average(school => ResonanceValue(resonance, school)) * SynergyResonanceWeightPerPoint;
    }

    private static int ResonanceValue(IReadOnlyList<RunResonanceEntry> resonance, SpellSchool school) => resonance.FirstOrDefault(entry => entry.School == school)?.Value ?? 0;

    private static RunUpgradeId ParseRunUpgrade(string id) => Enum.Parse<RunUpgradeId>(id[5..]);
    private static SpellId ParseSpell(string id) => Enum.Parse<SpellId>(id[6..]);
    private static SynergyId ParseSynergy(string id) => Enum.Parse<SynergyId>(id[8..]);
}
