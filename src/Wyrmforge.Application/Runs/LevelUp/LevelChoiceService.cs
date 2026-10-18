using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Application.Runs.Rewards;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Progression.Refinements;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.LevelUp;

public sealed class LevelChoiceService(
    IRandomSource randomSource,
    IReadOnlySet<SpellId>? availableSpells = null,
    IReadOnlySet<SpellEvolutionId>? availableEvolutions = null)
{
    private const double SpellResonanceWeightPerPoint = 0.04;
    private const double SynergyResonanceWeightPerPoint = 0.03;
    private const double RecentOfferWeightMultiplier = 0.35;
    private const int RecentDraftMemory = 2;
    private readonly IReadOnlySet<SpellEvolutionId> evolutionPool = availableEvolutions ?? SpellEvolutionCatalog.Base.Select(evolution => evolution.Id).ToHashSet();
    private readonly RewardChoiceEngine rewardChoiceEngine = new(randomSource);
    private readonly Queue<HashSet<string>> recentDrafts = [];
    private int openingDraftsRemaining = 2;

    public IReadOnlyList<LevelChoice> Roll(RunBuildState build, int count = 3) => RollInternal(build, null, null, count);

    public IReadOnlyList<LevelChoice> Roll(RunBuildState build, SpellSchool preferredSchool, int count = 3) => RollInternal(build, preferredSchool, null, count);

    public IReadOnlyList<LevelChoice> Roll(RunBuildState build, IReadOnlyList<RunResonanceEntry> resonance, int count = 3) => RollInternal(build, null, resonance, count);

    public IReadOnlyList<LevelChoice> Roll(RunBuildState build, SpellSchool preferredSchool, IReadOnlyList<RunResonanceEntry> resonance, int count = 3) =>
        RollInternal(build, preferredSchool, resonance, count);

    // All real run rewards enter through this path. Legacy Roll/Apply remain for
    // deterministic standalone catalogue tests and developer-owned simulations.
    public IReadOnlyList<LevelChoice> RollForProgression(RunBuildState build, int rewardLevel, bool trailReward,
        SpellSchool? preferredSchool = null, IReadOnlyList<RunResonanceEntry>? resonance = null, int count = 3)
    {
        if (count <= 0) return Array.Empty<LevelChoice>();
        if (!trailReward && PowerMilestoneProfile.IsMajorLevel(rewardLevel))
        {
            var primary = build.Spells.ActiveSpell;
            if (PowerMilestoneProfile.CanEvolve(rewardLevel, build.Spells[primary]))
            {
                var evolutions = CreateEvolutionDraft(build, primary);
                if (evolutions.Count > 0) return evolutions;
            }
            var major = CreatePool(build).Where(choice => PowerMilestoneProfile.IsMajorChoice(build, choice, rewardLevel)).ToList();
            // The first meaningful mastery is guaranteed, not a trap choice next to a
            // flashier rune: everybody reaches Rank II at their level-five breakthrough.
            if (rewardLevel == 5 && build.Spells[primary] == 1)
            {
                var rankTwo = major.SingleOrDefault(choice => choice.Id == $"spell:{primary}");
                if (rankTwo is not null) return [rankTwo with { Role = LevelChoiceDraftRole.Converge,
                    Hint = "YOUR FIRST BREAKTHROUGH • Rank II is earned before choosing alternate build directions." }];
            }
            if (major.Count > 0) return DraftMilestone(major, build, rewardLevel, resonance, count);
        }

        return DraftRefinements(build, preferredSchool, resonance, count);
    }

    public bool ApplyForProgression(RunBuildState build, LevelChoice choice, int rewardLevel, bool trailReward)
    {
        if (choice.Kind == LevelChoiceKind.Refinement)
        {
            if (!Enum.TryParse<RunRefinementId>(choice.Id.AsSpan("refine:".Length), out var id)
                || build.Refinements[id] + choice.RankStep > RunRefinementDefinition.MaxRank) return false;
            for (var rank = 0; rank < choice.RankStep; rank++) build.Refinements.Apply(id);
            return true;
        }

        if (trailReward || !PowerMilestoneProfile.IsMajorLevel(rewardLevel) ||
            !PowerMilestoneProfile.IsMajorChoice(build, choice, rewardLevel)) return false;
        return Apply(build, choice);
    }

    /// <summary>
    /// Fateweave: replaces exactly one visible card with another card from the same legal pool the draft was drawn from, so a
    /// reroll can never reach past the current milestone (no evolutions at level 3, no illegal runes). Uses the caller's own
    /// random stream, leaving the run's main reward stream, and so every later draft, untouched. Returns <c>null</c> when no
    /// legal alternative exists; callers must check <see cref="CanReweave"/> before spending a charge.
    /// </summary>
    public LevelChoice? Reweave(RunBuildState build, IReadOnlyList<LevelChoice> visible, int slot, IReadOnlySet<string> retired, int rewardLevel,
        bool trailReward, IReadOnlyList<RunResonanceEntry>? resonance, bool gilded, IRandomSource fateStream)
    {
        if (slot < 0 || slot >= visible.Count) return null;
        var replaced = visible[slot];
        var candidates = ReweaveCandidates(build, visible, retired, rewardLevel, trailReward);
        if (gilded)
        {
            var boosted = GildedCandidates(build, candidates, replaced);
            if (boosted.Count > 0) candidates = boosted;
        }
        if (candidates.Count == 0) return null;
        var engine = new RewardChoiceEngine(fateStream);
        var selected = engine.Roll(candidates.Select(choice => new RewardCandidate<LevelChoice>(choice.Id, choice, choice.Rarity, CalculateWeight(choice, resonance))), 1)
            .Single().Value;
        return selected with { Role = replaced.Role, Hint = ReweaveHint(build, selected, replaced, rewardLevel) };
    }

    public bool CanReweave(RunBuildState build, IReadOnlyList<LevelChoice> visible, IReadOnlySet<string> retired, int rewardLevel, bool trailReward) =>
        ReweaveCandidates(build, visible, retired, rewardLevel, trailReward).Count > 0;

    /// <summary>A golden opportunity is only offered when a genuinely stronger legal card exists for that slot.</summary>
    public bool CanGild(RunBuildState build, IReadOnlyList<LevelChoice> visible, int slot, IReadOnlySet<string> retired, int rewardLevel, bool trailReward) =>
        slot >= 0 && slot < visible.Count
        && GildedCandidates(build, ReweaveCandidates(build, visible, retired, rewardLevel, trailReward), visible[slot]).Count > 0;

    private List<LevelChoice> ReweaveCandidates(RunBuildState build, IReadOnlyList<LevelChoice> visible, IReadOnlySet<string> retired, int rewardLevel, bool trailReward)
    {
        var shown = visible.Select(choice => choice.Id).ToHashSet(StringComparer.Ordinal);
        var fresh = DraftPool(build, rewardLevel, trailReward).Where(choice => !shown.Contains(choice.Id)).ToList();
        var unseen = fresh.Where(choice => !retired.Contains(choice.Id)).ToList();
        return unseen.Count > 0 ? unseen : fresh;
    }

    private static List<LevelChoice> GildedCandidates(RunBuildState build, IReadOnlyList<LevelChoice> candidates, LevelChoice replaced)
    {
        // Minor drafts stay inside the minor envelope: a gilded refinement is two ranks of the same small stat, never a major power.
        if (replaced.Kind == LevelChoiceKind.Refinement)
            return candidates.Where(choice => choice.Kind == LevelChoiceKind.Refinement && choice.CurrentRank + LevelChoice.GildedRefinementRanks <= RunRefinementDefinition.MaxRank)
                .Select(choice => choice with
                {
                    Gilded = true,
                    Name = $"Gilded {choice.Name}",
                    Rarity = RewardRarity.Rare,
                })
                .ToList();
        // Breakthrough drafts: a higher-rarity card from the very same legal milestone pool. Evolutions are never gilded.
        if (replaced.Kind == LevelChoiceKind.Evolution) return [];
        return candidates.Where(choice => choice.Rarity > replaced.Rarity).Select(choice => choice with { Gilded = true }).ToList();
    }

    /// <summary>The exact pool <see cref="RollForProgression"/> draws this round from, without consuming any randomness.</summary>
    private List<LevelChoice> DraftPool(RunBuildState build, int rewardLevel, bool trailReward)
    {
        if (!trailReward && PowerMilestoneProfile.IsMajorLevel(rewardLevel))
        {
            var primary = build.Spells.ActiveSpell;
            if (PowerMilestoneProfile.CanEvolve(rewardLevel, build.Spells[primary]))
            {
                var evolutions = CreateEvolutionDraft(build, primary);
                if (evolutions.Count > 0) return evolutions.ToList();
            }
            var major = CreatePool(build).Where(choice => PowerMilestoneProfile.IsMajorChoice(build, choice, rewardLevel)).ToList();
            if (rewardLevel == 5 && build.Spells[primary] == 1 && major.Any(choice => choice.Id == $"spell:{primary}"))
                return major.Where(choice => choice.Id == $"spell:{primary}").ToList();
            if (major.Count > 0) return major;
        }
        return RefinementPool(build);
    }

    private static List<LevelChoice> RefinementPool(RunBuildState build) =>
        RunRefinementCatalog.All.Where(item => build.Refinements[item.Id] < RunRefinementDefinition.MaxRank)
            .Select(item => new LevelChoice($"refine:{item.Id}", LevelChoiceKind.Refinement, item.Name, item.Description, item.Icon,
                build.Refinements[item.Id], RunRefinementDefinition.MaxRank)).ToList();

    private static string? ReweaveHint(RunBuildState build, LevelChoice selected, LevelChoice replaced, int rewardLevel)
    {
        if (selected.Kind == replaced.Kind && selected.Kind is LevelChoiceKind.Refinement or LevelChoiceKind.Evolution) return replaced.Hint;
        return selected.Kind switch
        {
            LevelChoiceKind.SpellUpgrade => $"LEVEL {rewardLevel} BREAKTHROUGH • permanently strengthens your chosen primary for this hunt.",
            LevelChoiceKind.Synergy => "Fuse your committed primary with a supporting element, without losing existing ranks.",
            _ => "A rare, build-defining ability earned at a five-level breakthrough.",
        };
    }

    private IReadOnlyList<LevelChoice> DraftRefinements(RunBuildState build, SpellSchool? school,
        IReadOnlyList<RunResonanceEntry>? resonance, int count)
    {
        var pool = RefinementPool(build);
        return DrawRewardOptions(pool, count, resonance, _ => school is { } attuned
            ? $"A small {attuned} trail reward; the primary and its major abilities are unchanged."
            : "A modest improvement while your next breakthrough draws closer.");
    }

    private IReadOnlyList<LevelChoice> DraftMilestone(List<LevelChoice> pool, RunBuildState build, int level,
        IReadOnlyList<RunResonanceEntry>? resonance, int count)
    {
        var result = new List<LevelChoice>(Math.Min(count, pool.Count));
        var primaryUpgrade = pool.Where(choice => choice.Kind == LevelChoiceKind.SpellUpgrade && choice.Id == $"spell:{build.Spells.ActiveSpell}").ToList();
        if (primaryUpgrade.Count > 0)
            TakeInto(result, pool, primaryUpgrade, resonance, LevelChoiceDraftRole.Converge,
                _ => $"LEVEL {level} BREAKTHROUGH • permanently strengthens your chosen primary for this hunt.");
        // Keep an earned elemental combination visible alongside Rank III, instead of
        // letting two unrelated rare runes exhaust the 3-card breakthrough draft.
        var availableSynergies = pool.Where(choice => choice.Kind == LevelChoiceKind.Synergy).ToList();
        if (availableSynergies.Count > 0 && result.Count < count)
            TakeInto(result, pool, availableSynergies, resonance, LevelChoiceDraftRole.Venture,
                _ => "Fuse your committed primary with a supporting element, without losing existing ranks.");
        var roles = new[] { LevelChoiceDraftRole.Reinforce, LevelChoiceDraftRole.Venture };
        while (result.Count < count && pool.Count > 0)
        {
            var role = roles[Math.Min(result.Count == 0 ? 0 : result.Count - 1, roles.Length - 1)];
            TakeInto(result, pool, pool.ToList(), resonance, role,
                choice => choice.Kind == LevelChoiceKind.Synergy ? "Combine schools without changing your primary cast."
                    : "A rare, build-defining ability earned at a five-level breakthrough.");
        }
        RememberDraft(result);
        return result;
    }

    private IReadOnlyList<LevelChoice> DrawRewardOptions(List<LevelChoice> pool, int count,
        IReadOnlyList<RunResonanceEntry>? resonance, Func<LevelChoice, string> hint)
    {
        var result = new List<LevelChoice>(Math.Min(count, pool.Count));
        var roles = new[] { LevelChoiceDraftRole.Converge, LevelChoiceDraftRole.Reinforce, LevelChoiceDraftRole.Venture };
        while (result.Count < count && pool.Count > 0)
            TakeInto(result, pool, pool.ToList(), resonance, roles[Math.Min(result.Count, roles.Length - 1)], choice => hint(choice));
        RememberDraft(result);
        return result;
    }

    public bool Apply(RunBuildState build, LevelChoice choice)
    {
        if (choice.Kind == LevelChoiceKind.SchoolPower && Enum.TryParse<SpellSchool>(choice.Id[6..], out var school))
        {
            build.EmpowerSchool(school);
            return true;
        }
        if (choice.Id.StartsWith("rune:", StringComparison.Ordinal)) return build.RunUpgrades.Apply(ParseRunUpgrade(choice.Id));
        if (choice.Id.StartsWith("focus:", StringComparison.Ordinal)) return !build.Spells.IsPrimaryCommitted && build.Spells.TryFocus(ParseSpell(choice.Id));
        if (choice.Id.StartsWith("spell:", StringComparison.Ordinal))
        {
            var spell = ParseSpell(choice.Id);
            if (build.Spells.IsPrimaryCommitted && spell != build.Spells.ActiveSpell) return false;
            if (!build.Spells.LearnOrUpgrade(spell)) return false;
            if (!build.Spells.IsPrimaryCommitted) build.Spells.TryFocus(spell);
            return true;
        }
        if (choice.Id.StartsWith("evolution:", StringComparison.Ordinal))
        {
            var evolution = ParseEvolution(choice.Id);
            return evolutionPool.Contains(evolution) && build.Evolutions.Select(evolution, build.Spells);
        }
        if (choice.Id.StartsWith("synergy:", StringComparison.Ordinal))
        {
            var synergy = ParseSynergy(choice.Id);
            var definition = SynergyCatalog.Get(synergy);
            if (!CanAcquireCombination(build, definition)) return false;
            foreach (var requirement in definition.RequiredSpells.Where(spell => build.Spells[spell] == 0)) build.Spells.LearnOrUpgrade(requirement);
            return build.Synergies.Select(synergy, build.Spells);
        }
        return false;
    }

    public IReadOnlyList<LevelChoice> CreateEvolutionDraft(RunBuildState build, SpellId spell)
    {
        if (build.Evolutions.For(spell) is not null || build.Spells[spell] < SpellCatalog.Get(spell).MaxRank) return Array.Empty<LevelChoice>();

        return SpellEvolutionCatalog.For(spell)
            .Where(evolution => evolutionPool.Contains(evolution.Id))
            .Select(evolution => new LevelChoice(
                $"evolution:{evolution.Id}",
                LevelChoiceKind.Evolution,
                evolution.Name,
                evolution.Description,
                evolution.Icon,
                0,
                1,
                RewardRarity.Legendary,
                LevelChoiceDraftRole.Converge,
                $"{SpellCatalog.Get(spell).Name} has reached Rank III. Choose one transformation for this run."))
            .ToArray();
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

        if (preferredSchool.HasValue) AddConvergeChoice(choices, pool, build, preferredSchool, resonance);
        AddReinforceChoice(choices, pool, build, resonance);
        if (!preferredSchool.HasValue) AddConvergeChoice(choices, pool, build, null, resonance);
        if (count >= 3) AddVentureChoice(choices, pool, build, resonance);
        AddFallbackChoice(choices, pool, build, resonance, count);
        openingDraftsRemaining = Math.Max(0, openingDraftsRemaining - 1);
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
            .Where(spell => (availableSpells is null || availableSpells.Contains(spell.Id)) && build.Spells[spell.Id] < spell.MaxRank
                && (!build.Spells.IsPrimaryCommitted || spell.Id == build.Spells.ActiveSpell))
            .Select(spell =>
            {
                var currentRank = build.Spells[spell.Id];
                var kind = currentRank == 0 ? LevelChoiceKind.NewSpell : LevelChoiceKind.SpellUpgrade;
                return new LevelChoice(
                    $"spell:{spell.Id}",
                    kind,
                    spell.Name,
                    spell.Id != build.Spells.ActiveSpell
                        ? $"Replaces {SpellCatalog.Get(build.Spells.ActiveSpell).Name} as your primary cast. {spell.Description}" : spell.Description,
                    spell.Icon,
                    currentRank,
                    spell.MaxRank,
                    SpellRarity(spell, currentRank));
            }));
        choices.AddRange(SpellCatalog.All
            .Where(spell => !build.Spells.IsPrimaryCommitted && build.Spells[spell.Id] == spell.MaxRank && spell.Id != build.Spells.ActiveSpell)
            .Select(spell => new LevelChoice(
                $"focus:{spell.Id}", LevelChoiceKind.SpellFocus, $"Focus {spell.Name}",
                $"Replace {SpellCatalog.Get(build.Spells.ActiveSpell).Name} as your primary cast. Learned spells and ranks are retained for combinations.",
                spell.Icon, build.Spells[spell.Id], spell.MaxRank, RewardRarity.Common)));
        choices.AddRange(SynergyCatalog.All
            .Where(synergy => CanAcquireCombination(build, synergy))
            .Select(synergy => new LevelChoice(
                $"synergy:{synergy.Id}",
                LevelChoiceKind.Synergy,
                synergy.Name,
                $"Keeps {SpellCatalog.Get(build.Spells.ActiveSpell).Name} as your primary cast. {synergy.Description}",
                synergy.Icon,
                0,
                1,
                RewardRarity.Legendary)));
        return choices;
    }

    private bool CanAcquireCombination(RunBuildState build, SynergyDefinition synergy)
    {
        if (build.Synergies.Contains(synergy.Id) || !synergy.CanHost(build.Spells.ActiveSpell)) return false;
        if (synergy.RequiredSpells.Any(spell => build.Spells[spell] == 0 && availableSpells is not null && !availableSpells.Contains(spell))) return false;
        return build.Spells[build.Spells.ActiveSpell] >= 2 || synergy.RequiredSpells.All(spell => build.Spells[spell] > 0);
    }

    private void AddReinforceChoice(List<LevelChoice> result, List<LevelChoice> pool, RunBuildState build, IReadOnlyList<RunResonanceEntry>? resonance)
    {
        var representedSchools = LearnedSchools(build);
        var candidates = pool.Where(choice => choice.Kind == LevelChoiceKind.SpellUpgrade && ParseSpell(choice.Id) == build.Spells.ActiveSpell
            || choice.Kind == LevelChoiceKind.Rune && RuneFitsRepresentedSchools(choice, representedSchools)).ToList();
        if (openingDraftsRemaining > 0)
        {
            var immediate = candidates.Where(choice => choice.Kind == LevelChoiceKind.SpellUpgrade).ToList();
            if (immediate.Count == 0) immediate = candidates.Where(choice => choice.Id is "rune:Potency" or "rune:Quickening").ToList();
            if (immediate.Count > 0) candidates = immediate;
        }
        if (candidates.Count == 0) candidates = pool.Where(choice => choice.Kind != LevelChoiceKind.Synergy).ToList();
        TakeInto(result, pool, candidates, resonance, LevelChoiceDraftRole.Reinforce, choice => ReinforceHint(choice, representedSchools));
    }

    private void AddConvergeChoice(List<LevelChoice> result, List<LevelChoice> pool, RunBuildState build, SpellSchool? preferredSchool, IReadOnlyList<RunResonanceEntry>? resonance)
    {
        if (preferredSchool is { } guaranteedSchool)
        {
            // The route may be attuned to a different element, but the reward cannot
            // encourage an unusable pivot or off-primary school-damage investment.
            if (build.Spells.IsPrimaryCommitted && guaranteedSchool != SpellCatalog.Get(build.Spells.ActiveSpell).School)
            {
                var compatible = pool.Where(choice => choice.Kind == LevelChoiceKind.Synergy
                    && SynergyCatalog.Get(ParseSynergy(choice.Id)).RequiredSpells
                        .Any(spell => SpellCatalog.Get(spell).School == guaranteedSchool)).ToList();
                if (compatible.Count > 0)
                {
                    TakeInto(result, pool, compatible, resonance, LevelChoiceDraftRole.Converge,
                        _ => $"A {guaranteedSchool} interaction strengthens your committed primary.");
                    return;
                }
                guaranteedSchool = SpellCatalog.Get(build.Spells.ActiveSpell).School;
            }
            var matching = pool.Where(choice => IsSpellChoiceForSchool(choice, guaranteedSchool)).ToList();
            if (matching.Count == 0) matching = pool.Where(choice => choice.Kind == LevelChoiceKind.Rune && RuneSchool(ParseRunUpgrade(choice.Id)) == guaranteedSchool).ToList();
            if (matching.Count > 0)
                TakeInto(result, pool, matching, resonance, LevelChoiceDraftRole.Converge, _ => $"Route attunement: {guaranteedSchool}.");
            else
                result.Add(new LevelChoice($"power:{guaranteedSchool}", LevelChoiceKind.SchoolPower, $"{guaranteedSchool} Attunement",
                    $"+10% {guaranteedSchool} spell damage for this hunt.", "✦", build.SchoolPower(guaranteedSchool), int.MaxValue,
                    RewardRarity.Uncommon, LevelChoiceDraftRole.Converge, $"Route attunement: {guaranteedSchool}."));
            return;
        }
        var readySynergies = pool.Where(choice => choice.Kind == LevelChoiceKind.Synergy).ToList();
        if (readySynergies.Count > 0)
        {
            TakeInto(result, pool, readySynergies, resonance, LevelChoiceDraftRole.Converge, choice => ReadySynergyHint(choice));
            return;
        }

        var newSpells = pool.Where(choice => choice.Kind == LevelChoiceKind.NewSpell).ToList();
        if (newSpells.Count > 0)
        {
            TakeInto(result, pool, newSpells, resonance, LevelChoiceDraftRole.Converge, choice => ConvergeSpellHint(build, choice),
                choice => SynergiesCompletedBy(build, choice).Count > 0 ? 1.9 : 1);
            return;
        }

        var spellChoices = pool.Where(choice => choice.Kind is LevelChoiceKind.NewSpell or LevelChoiceKind.SpellUpgrade or LevelChoiceKind.SpellFocus).ToList();
        if (spellChoices.Count > 0)
        {
            TakeInto(result, pool, spellChoices, resonance, LevelChoiceDraftRole.Converge, _ => "Keeps your spell package moving toward a stronger interaction.");
            return;
        }

        TakeInto(result, pool, pool.ToList(), resonance, LevelChoiceDraftRole.Converge, _ => "No direct convergence is available; take the strongest remaining direction.");
    }

    private void AddVentureChoice(List<LevelChoice> result, List<LevelChoice> pool, RunBuildState build, IReadOnlyList<RunResonanceEntry>? resonance)
    {
        var readySynergies = pool.Where(choice => choice.Kind == LevelChoiceKind.Synergy).ToList();
        if (readySynergies.Count > 0)
        {
            TakeInto(result, pool, readySynergies, resonance, LevelChoiceDraftRole.Venture, choice => ReadySynergyHint(choice));
            return;
        }

        var representedSchools = LearnedSchools(build);
        var offSchoolSpells = pool.Where(choice => choice.Kind == LevelChoiceKind.NewSpell && !representedSchools.Contains(SpellCatalog.Get(ParseSpell(choice.Id)).School)).ToList();
        if (offSchoolSpells.Count > 0)
        {
            TakeInto(result, pool, offSchoolSpells, resonance, LevelChoiceDraftRole.Venture,
                choice => $"Pivot: opens the {SpellCatalog.Get(ParseSpell(choice.Id)).School} school.");
            return;
        }

        var knownPrimaries = pool.Where(choice => choice.Kind == LevelChoiceKind.SpellFocus
            || choice.Kind == LevelChoiceKind.SpellUpgrade && ParseSpell(choice.Id) != build.Spells.ActiveSpell).ToList();
        if (knownPrimaries.Count > 0)
        {
            TakeInto(result, pool, knownPrimaries, resonance, LevelChoiceDraftRole.Venture, _ => "Pivot: switch to a known primary; previous spell knowledge is retained.");
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

    private static bool RuneFitsRepresentedSchools(LevelChoice choice, IReadOnlySet<SpellSchool> representedSchools)
    {
        var school = RuneSchool(ParseRunUpgrade(choice.Id));
        return school is null || representedSchools.Contains(school.Value);
    }

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
            : "Switches your primary cast and retains your learned magic for combinations.";
    }

    private static IReadOnlyList<SynergyDefinition> SynergiesCompletedBy(RunBuildState build, LevelChoice choice)
    {
        if (choice.Kind != LevelChoiceKind.NewSpell) return Array.Empty<SynergyDefinition>();
        var spellId = ParseSpell(choice.Id);
        return SynergyCatalog.All
            .Where(synergy => !build.Synergies.Contains(synergy.Id)
                && synergy.CanHost(spellId)
                && synergy.RequiredSpells.Contains(spellId)
                && synergy.RequiredSpells.Where(required => required != spellId).All(required => build.Spells[required] > 0))
            .ToArray();
    }

    private static string FallbackHint(RunBuildState build, LevelChoice choice)
    {
        if (choice.Kind == LevelChoiceKind.SpellFocus) return "Switches your primary cast; learned magic stays available for combinations.";
        if (choice.Kind == LevelChoiceKind.NewSpell) return ConvergeSpellHint(build, choice) ?? "Adds another spell to this run.";
        if (choice.Kind == LevelChoiceKind.Evolution) return "Transforms a mastered spell for the rest of this run.";
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
        if (choice.Id.StartsWith("evolution:", StringComparison.Ordinal))
        {
            var school = SpellCatalog.Get(SpellEvolutionCatalog.Get(ParseEvolution(choice.Id)).Spell).School;
            return 1 + ResonanceValue(resonance, school) * SpellResonanceWeightPerPoint;
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

    private static SpellSchool? RuneSchool(RunUpgradeId id) => Telemetry.ChoiceSchools.RuneSchool(id);

    private static int ResonanceValue(IReadOnlyList<RunResonanceEntry> resonance, SpellSchool school) => resonance.FirstOrDefault(entry => entry.School == school)?.Value ?? 0;
    private static RunUpgradeId ParseRunUpgrade(string id) => Enum.Parse<RunUpgradeId>(id[5..]);
    private static SpellId ParseSpell(string id) => Enum.Parse<SpellId>(id[6..]);
    private static SpellEvolutionId ParseEvolution(string id) => Enum.Parse<SpellEvolutionId>(id[10..]);
    private static SynergyId ParseSynergy(string id) => Enum.Parse<SynergyId>(id[8..]);
}
