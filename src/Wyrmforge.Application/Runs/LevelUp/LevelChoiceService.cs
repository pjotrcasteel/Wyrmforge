using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Rewards;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.LevelUp;

public sealed class LevelChoiceService(IRandomSource randomSource)
{
    private readonly RewardChoiceEngine rewardChoiceEngine = new(randomSource);

    public IReadOnlyList<LevelChoice> Roll(RunBuildState build, int count = 3) => RollInternal(build, null, count);

    public IReadOnlyList<LevelChoice> Roll(RunBuildState build, SpellSchool preferredSchool, int count = 3) => RollInternal(build, preferredSchool, count);

    public bool Apply(RunBuildState build, LevelChoice choice)
    {
        if (choice.Id.StartsWith("rune:", StringComparison.Ordinal)) return build.RunUpgrades.Apply(ParseRunUpgrade(choice.Id));
        if (choice.Id.StartsWith("spell:", StringComparison.Ordinal)) return build.Spells.LearnOrUpgrade(ParseSpell(choice.Id));
        if (choice.Id.StartsWith("synergy:", StringComparison.Ordinal)) return build.Synergies.Select(ParseSynergy(choice.Id), build.Spells);
        return false;
    }

    private IReadOnlyList<LevelChoice> RollInternal(RunBuildState build, SpellSchool? preferredSchool, int count)
    {
        var pool = CreatePool(build);
        var choices = new List<LevelChoice>();

        var synergies = pool.Where(choice => choice.Kind == LevelChoiceKind.Synergy).ToList();
        if (synergies.Count > 0)
        {
            choices.Add(TakeReward(synergies));
        }
        else if (build.Spells.LearnedCount < 2)
        {
            var newSpells = pool.Where(choice => choice.Kind == LevelChoiceKind.NewSpell).ToList();
            if (newSpells.Count > 0) choices.Add(TakeReward(newSpells));
        }

        var used = choices.Select(choice => choice.Id).ToHashSet();
        if (preferredSchool is { } school && choices.Count < count)
        {
            var preferredChoices = pool.Where(choice => !used.Contains(choice.Id) && IsSpellChoiceForSchool(choice, school)).ToList();
            if (preferredChoices.Count > 0)
            {
                var preferred = TakeReward(preferredChoices);
                choices.Add(preferred);
                used.Add(preferred.Id);
            }
        }

        var remainder = pool.Where(choice => !used.Contains(choice.Id)).ToList();
        while (remainder.Count > 0 && choices.Count < count) choices.Add(TakeReward(remainder));
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

    private static bool IsSpellChoiceForSchool(LevelChoice choice, SpellSchool school) => choice.Id.StartsWith("spell:", StringComparison.Ordinal) && SpellCatalog.Get(ParseSpell(choice.Id)).School == school;

    private LevelChoice TakeReward(List<LevelChoice> choices)
    {
        var selected = rewardChoiceEngine.Roll(choices.Select(choice => new RewardCandidate<LevelChoice>(choice.Id, choice)), 1).Single().Value;
        choices.RemoveAll(choice => choice.Id == selected.Id);
        return selected;
    }

    private static RunUpgradeId ParseRunUpgrade(string id) => Enum.Parse<RunUpgradeId>(id[5..]);
    private static SpellId ParseSpell(string id) => Enum.Parse<SpellId>(id[6..]);
    private static SynergyId ParseSynergy(string id) => Enum.Parse<SynergyId>(id[8..]);
}
