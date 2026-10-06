using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Application.Runs.Rewards;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.LevelUp;

public sealed class LevelChoiceService(IRandomSource randomSource, IReadOnlySet<SpellId>? availableSpells = null)
{
    private const double SpellResonanceWeightPerPoint = 0.04;
    private const double SynergyResonanceWeightPerPoint = 0.03;
    private const double RecentOfferWeightMultiplier = 0.35;
    private const int RecentDraftMemory = 2;
    private readonly RewardChoiceEngine rewardChoiceEngine = new(randomSource);
    private readonly Queue<HashSet<string>> recentDrafts = [];

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
        if (count <= 0) return Array.Empty<LevelChoice>();

        var pool = CreatePool(build);
        var choices = new List<LevelChoice>(Math.Min(count, pool.Count));
        if (count == 1)
        {
            AddConvergeChoice(choices, pool, build, preferredSchool, resonance);
            AddFallbackChoice(choices, pool, build, resonance, count);
            RememberDraft(choices);
            return choices;
        }

        AddReinforceChoice(choices, pool, build, resonance);
        AddConvergeChoice(choices, pool, build, preferredSchool, resonance);
        if (count >= 3) AddVentureChoice(choices, pool, build, resonance);
        AddFallbackChoice(choices, pool, build, resonance, count);
        RememberDraft(choices);
        return choices;
    }

    private List<LevelChoice> CreatePool(RunBuildState build)
    {
        var choices = new List<LevelChoice>();
        choices.AddRange(RunUpgradeCatalog.All
            .Where(upgrade => build.RunUpgrades[upgrade.Id] < upgrade.MaxRank)
            .Select(upgrade => new LevelChoice(
                $"rune:{upgrade.Id}",
                LevelChoiceKind.Rune,
                upgrade.Name,
                upgrade.Description,
                upgrade.Icon,
                build.RunUpgrades[upgrade.Id],
                upgrade.MaxRank,
                RuneRarity(upgrade.Id))));
        choices.AddRange(SpellCatalog.All
            .Where(spell => (availableSpells is null || availableSpells.Contains(spell.Id)) && build.Spells[spell.Id] < spell.MaxRank)
            .Select(spell =>
            {
                var currentRank = build.Spells[spell.Id];
                var kind = currentRank == 0 ? LevelChoiceKind.NewSpell : LevelChoiceKind.SpellUpgrade;
                return new LevelChoice(
                    $"spell:{spell.Id}",
                    kind,
                    spell.Name,
                    spell.Description,
                    spell.Icon,
                    currentRank,
                    spell.MaxRank,
                    SpellRarity(spell, currentRank));
            }));
        choices.AddRange(SynergyCatalog.All
            .Where(synergy => build.Synergies.IsAvailable(synergy.Id, build.Spells))
            .Select(synergy => new LevelChoice(
                $"synergy:{synergy.Id}",
                LevelChoiceKind.Synergy,
                synergy.Name,
                synergy.Description,
                synergy.Icon,
                0,
                1,
                RewardRarity.Legendary)));
        return choices;
    }

    private void AddReinforceChoice(List<LevelChoice> result, List<LevelChoice> pool, RunBuildState build, IReadOnlyList<RunResonanceEntry>? resonance)
    {
        var representedSchools = LearnedSchools(build);
        var candidates = pool.Where(choice => choice.Kind == LevelChoiceKind.SpellUpgrade
            || choice.Kind == LevelChoiceKind.Rune && (RuneSchool(ParseRunUpgrade(choice.Id)) is not { } school || representedSchools.Contains(school))).ToList();
        if (candidates.Count == 0) candidates = pool.Where(choice => choice.Kind != LevelChoiceKind.Synergy).ToList();
        TakeInto(result, pool, candidates, resonance, LevelChoiceDraftRole.Reinforce, choice => ReinforceHint(choice, representedSchools));
    }

    private void AddConvergeChoice(List<LevelChoice> result, List<LevelChoice> pool, RunBuildState build, SpellSchool? preferredSchool, IReadOnlyList<RunResonanceEntry>? resonance)
    {
        var readySynergies = pool.Where(choice => choice.Kind == LevelChoiceKind.Synergy).ToList();
        if (readySynergies.Count > 0)
        {
            TakeInto(result, pool, readySynergies, resonance, LevelChoiceDraftRole.Converge, choice => ReadySynergyHint(choice));
            return;
        }

        if (preferredSchool is { } school)
        {
            var attuned = pool.Where(choice => IsSpellChoiceForSchool(choice, school)).ToList();
            if (attuned.Count > 0)
            {
                TakeInto(result, pool, attuned, resonance, LevelChoiceDraftRole.Converge, _ => $"Route attunement: {school}.");
                return;
            }
        }

        var newSpells = pool.Where(choice => choice.Kind == LevelChoiceKind.NewSpell).ToList();
        if (newSpells.Count > 0)
        {
            TakeInto(result, pool, newSpells, resonance, LevelChoiceDraftRole.Converge, choice => ConvergeSpellHint(build, choice),
                choice => SynergiesCompletedBy(build, choice).Count > 0 ? 1.9 : 1);
            return;
        }

        var spellChoices = pool.Where(choice => choice.Kind is LevelChoiceKind.NewSpell or LevelChoiceKind.SpellUpgrade).ToList();
        if (spellChoices.Count > 0)
        {
            TakeInto(result, pool, spellChoices, resonance, LevelChoiceDraftRole.Converge, _ => "Keeps your spell package moving toward a stronger interaction.");
            return;
        }

        TakeInto(result, pool, pool.ToList(), resonance, LevelChoiceDraftRole.Converge, _ => "No direct convergence is available; take the strongest remaining direction.");
    }

    private void AddVentureChoice(List<LevelChoice> result, List<LevelChoice> pool, RunBuildState build, IReadOnlyList<RunResonanceEntry>? resonance)
    {
        var representedSchools = LearnedSchools(build);
        var offSchoolSpells = pool.Where(choice => choice.Kind == LevelChoiceKind.NewSpell && !representedSchools.Contains(SpellCatalog.Get(ParseSpell(choice.Id)).School)).ToList();
        if (offSchoolSpells.Count > 0)
        {
            TakeInto(result, pool, offSchoolSpells, resonance, LevelChoiceDraftRole.Venture,
                choice => $"Pivot: opens the {SpellCatalog.Get(ParseSpell(choice.Id)).School} school.");
            return;
        }

        var rareRunes = pool.Where(choice => choice.Kind == LevelChoiceKind.Rune && IsAtLeastRare(choice.Rarity)).ToList();
        if (rareRunes.Count > 0)
        {
            TakeInto(result, pool, rareRunes, resonance, LevelChoiceDraftRole.Venture, _ => "A rarer rule-changing direction for this run.", choice => 1.6);
            return;
        }

        TakeInto(result, pool, pool.ToList(), resonance, LevelChoiceDraftRole.Venture, _ => "The wildcard: take the run somewhere less expected.", choice => IsAtLeastRare(choice.Rarity) ? 1.5 : 1);
    }

    private void AddFallbackChoice(List<LevelChoice> result, List<LevelChoice> pool, RunBuildState build, IReadOnlyList<RunResonanceEntry>? resonance, int count)
    {
        while (result.Count < count && pool.Count > 0)
        {
            var role = result.Count switch
            {
                0 => LevelChoiceDraftRole.Converge,
                1 => LevelChoiceDraftRole.Reinforce,
                _ => LevelChoiceDraftRole.Venture,
            };
            TakeInto(result, pool, pool.ToList(), resonance, role, choice => FallbackHint(build, choice));
        }
    }

    private void TakeInto(List<LevelChoice> result, List<LevelChoice> pool, IReadOnlyList<LevelChoice> candidates, IReadOnlyList<RunResonanceEntry>? resonance,
        LevelChoiceDraftRole role, Func<LevelChoice, string?> hint, Func<LevelChoice, double>? extraWeight = null)
    {
        if (candidates.Count == 0) return;
        var rewards = candidates.Select(choice => new RewardCandidate<LevelChoice>(
            choice.Id,
            choice,
            choice.Rarity,
            CalculateWeight(choice, resonance) * RecentOfferMultiplier(choice.Id) * (extraWeight?.Invoke(choice) ?? 1)));
        var selected = rewardChoiceEngine.Roll(rewards, 1).Single().Value;
        pool.RemoveAll(choice => choice.Id == selected.Id);
        result.Add(selected with { Role = role, Hint = hint(selected) });
    }

    private double RecentOfferMultiplier(string id) => recentDrafts.Any(draft => draft.Contains(id)) ? RecentOfferWeightMultiplier : 1;

    private void RememberDraft(IReadOnlyList<LevelChoice> choices)
    {
        recentDrafts.Enqueue(choices.Select(choice => choice.Id).ToHashSet(StringComparer.Ordinal));
        while (recentDrafts.Count > RecentDraftMemory) recentDrafts.Dequeue();
    }

    private static HashSet<SpellSchool> LearnedSchools(RunBuildState build) => SpellCatalog.All
        .Where(spell => build.Spells[spell.Id] > 0)
        .Select(spell => spell.School)
        .ToHashSet();

    private static string ReinforceHint(LevelChoice choice, IReadOnlySet<SpellSchool> representedSchools)
    {
        if (choice.Kind == LevelChoiceKind.SpellUpgrade) return "Reinforces a spell already carrying this run.";
        if (choice.Kind != LevelChoiceKind.Rune) return "Deepens your current direction.";
        var school = RuneSchool(ParseRunUpgrade(choice.Id));
        return school is { } affinity && representedSchools.Contains(affinity) ? $"Supports your existing {affinity} package." : "Reliable power that fits almost any build.";
    }

    private static string ReadySynergyHint(LevelChoice choice)
    {
        var synergy = SynergyCatalog.Get(ParseSynergy(choice.Id));
        return $"Ready now: {string.Join(" + ", synergy.RequiredSpells.Select(id => SpellCatalog.Get(id).Name))}.";
    }

    private static string? ConvergeSpellHint(RunBuildState build, LevelChoice choice)
    {
        var synergies = SynergiesCompletedBy(build, choice);
        return synergies.Count > 0
            ? $"Completes {string.Join(" / ", synergies.Select(synergy => synergy.Name))} requirements; the Synergy can appear next."
            : "Adds another spell to your interaction pool.";
    }

    private static IReadOnlyList<SynergyDefinition> SynergiesCompletedBy(RunBuildState build, LevelChoice choice)
    {
        if (choice.Kind != LevelChoiceKind.NewSpell) return Array.Empty<SynergyDefinition>();
        var spellId = ParseSpell(choice.Id);
        return SynergyCatalog.All
            .Where(synergy => !build.Synergies.Contains(synergy.Id)
                && synergy.RequiredSpells.Contains(spellId)
                && synergy.RequiredSpells.Where(required => required != spellId).All(required => build.Spells[required] > 0))
            .ToArray();
    }

    private static string FallbackHint(RunBuildState build, LevelChoice choice)
    {
        if (choice.Kind == LevelChoiceKind.NewSpell) return ConvergeSpellHint(build, choice) ?? "Adds another spell to this run.";
        if (choice.Kind == LevelChoiceKind.Synergy) return ReadySynergyHint(choice);
        return "A valid remaining direction for this run.";
    }

    private static bool IsSpellChoiceForSchool(LevelChoice choice, SpellSchool school) =>
        choice.Id.StartsWith("spell:", StringComparison.Ordinal) && SpellCatalog.Get(ParseSpell(choice.Id)).School == school;

    private static double CalculateWeight(LevelChoice choice, IReadOnlyList<RunResonanceEntry>? resonance)
    {
        if (resonance is null) return 1;
        if (choice.Id.StartsWith("spell:", StringComparison.Ordinal))
        {
            var school = SpellCatalog.Get(ParseSpell(choice.Id)).School;
            return 1 + ResonanceValue(resonance, school) * SpellResonanceWeightPerPoint;
        }
        if (choice.Id.StartsWith("rune:", StringComparison.Ordinal) && RuneSchool(ParseRunUpgrade(choice.Id)) is { } runeSchool)
        {
            return 1 + ResonanceValue(resonance, runeSchool) * SpellResonanceWeightPerPoint * 0.75;
        }
        if (!choice.Id.StartsWith("synergy:", StringComparison.Ordinal)) return 1;
        var synergy = SynergyCatalog.Get(ParseSynergy(choice.Id));
        var schools = synergy.RequiredSpells.Select(id => SpellCatalog.Get(id).School).Distinct().ToArray();
        return 1 + schools.Average(school => ResonanceValue(resonance, school)) * SynergyResonanceWeightPerPoint;
    }

    private static bool IsAtLeastRare(RewardRarity rarity) => rarity is RewardRarity.Rare or RewardRarity.Legendary;

    private static RewardRarity SpellRarity(SpellDefinition spell, int currentRank)
    {
        if (currentRank == 0) return RewardRarity.Uncommon;
        return currentRank + 1 == spell.MaxRank ? RewardRarity.Rare : RewardRarity.Common;
    }

    private static RewardRarity RuneRarity(RunUpgradeId id) => id switch
    {
        RunUpgradeId.Multicast or RunUpgradeId.FrostTouch or RunUpgradeId.ChainSpark or RunUpgradeId.ArcaneEcho or RunUpgradeId.Emberbrand or RunUpgradeId.StaticCharge => RewardRarity.Rare,
        RunUpgradeId.Quickening or RunUpgradeId.Fleetfoot or RunUpgradeId.Bulwark or RunUpgradeId.Velocity => RewardRarity.Uncommon,
        _ => RewardRarity.Common,
    };

    private static SpellSchool? RuneSchool(RunUpgradeId id) => id switch
    {
        RunUpgradeId.Quickening or RunUpgradeId.Fleetfoot or RunUpgradeId.ChainSpark or RunUpgradeId.StaticCharge => SpellSchool.Storm,
        RunUpgradeId.Vitality or RunUpgradeId.FrostTouch or RunUpgradeId.Bulwark => SpellSchool.Frost,
        RunUpgradeId.Multicast or RunUpgradeId.ArcaneEcho or RunUpgradeId.Velocity => SpellSchool.Arcane,
        RunUpgradeId.Emberbrand => SpellSchool.Fire,
        _ => null,
    };

    private static int ResonanceValue(IReadOnlyList<RunResonanceEntry> resonance, SpellSchool school) => resonance.FirstOrDefault(entry => entry.School == school)?.Value ?? 0;
    private static RunUpgradeId ParseRunUpgrade(string id) => Enum.Parse<RunUpgradeId>(id[5..]);
    private static SpellId ParseSpell(string id) => Enum.Parse<SpellId>(id[6..]);
    private static SynergyId ParseSynergy(string id) => Enum.Parse<SynergyId>(id[8..]);
}
