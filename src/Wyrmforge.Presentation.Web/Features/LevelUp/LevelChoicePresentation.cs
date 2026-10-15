using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Combat.Abilities;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Presentation.Web.Features.LevelUp;

public static class LevelChoicePresentation
{
    public static string KindClass(LevelChoice choice) => choice.Kind switch
    {
        LevelChoiceKind.Rune or LevelChoiceKind.Refinement or LevelChoiceKind.SchoolPower => "rune",
        LevelChoiceKind.NewSpell or LevelChoiceKind.SpellFocus => "new-spell",
        LevelChoiceKind.SpellUpgrade => "spell-upgrade",
        LevelChoiceKind.Evolution => "evolution",
        _ => "synergy",
    };

    public static string RarityClass(LevelChoice choice) => choice.Rarity.ToString().ToLowerInvariant();

    public static string Badge(LevelChoice choice) => choice.Kind switch
    {
        LevelChoiceKind.SchoolPower => "ATTUNEMENT",
        LevelChoiceKind.Rune => "MAJOR RUNE",
        LevelChoiceKind.Refinement => "REFINEMENT",
        LevelChoiceKind.NewSpell => "SUPPORT MAGIC",
        LevelChoiceKind.SpellFocus => "PRIMARY FOCUS",
        LevelChoiceKind.SpellUpgrade => "SPELL UPGRADE",
        LevelChoiceKind.Evolution => "EVOLUTION",
        _ => "SYNERGY",
    };

    public static string Rank(LevelChoice choice)
    {
        if (choice.Kind == LevelChoiceKind.Refinement) return $"{Roman(choice.CurrentRank)} → {Roman(choice.CurrentRank + 1)} / {Roman(choice.MaxRank)}";
        if (choice.Kind == LevelChoiceKind.SpellFocus) return $"KNOWN RANK {Roman(choice.CurrentRank)}";
        if (choice.Kind == LevelChoiceKind.SchoolPower) return $"+{(choice.CurrentRank + 1) * 10}% SCHOOL DAMAGE";
        if (choice.Kind == LevelChoiceKind.Synergy) return "NEW INTERACTION";
        if (choice.Kind == LevelChoiceKind.Evolution) return "EVOLVED FORM";
        if (choice.Kind == LevelChoiceKind.NewSpell) return "RANK I";
        if (choice.CurrentRank == 0) return $"RANK I / {Roman(choice.MaxRank)}";
        return $"{Roman(choice.CurrentRank)} → {Roman(choice.CurrentRank + 1)}";
    }

    public static string Delta(LevelChoice choice)
    {
        if (choice.Kind == LevelChoiceKind.SpellFocus) return choice.Description;
        if (choice.Kind == LevelChoiceKind.SchoolPower) return choice.Description;
        if (choice.Kind == LevelChoiceKind.Refinement) return RefinementDelta(choice);
        if (choice.Kind == LevelChoiceKind.Rune) return RuneDelta(ParseRunUpgrade(choice.Id), choice.CurrentRank);
        if (choice.Kind is LevelChoiceKind.NewSpell or LevelChoiceKind.SpellUpgrade) return SpellDelta(ParseSpell(choice.Id), choice.CurrentRank);
        if (choice.Kind == LevelChoiceKind.Evolution) return EvolutionDelta(ParseEvolution(choice.Id));
        return SynergyDelta(ParseSynergy(choice.Id));
    }

    public static string Footer(LevelChoice choice) => choice.Kind switch
    {
        LevelChoiceKind.Rune or LevelChoiceKind.SchoolPower => "MAJOR • THIS RUN ONLY",
        LevelChoiceKind.Refinement => "MINOR • BUILDS TOWARD YOUR NEXT BREAKTHROUGH",
        LevelChoiceKind.NewSpell or LevelChoiceKind.SpellFocus => "THIS RUN • NO MID-RUN PIVOT",
        LevelChoiceKind.SpellUpgrade => "THIS RUN • STRENGTHENS YOUR PRIMARY",
        LevelChoiceKind.Evolution => "TEMPORARY • DEFINES THIS SPELL",
        _ => "THIS RUN • KEEPS PRIMARY CAST",
    };

    private static string RefinementDelta(LevelChoice choice) => choice.Id switch
    {
        "refine:Force" => $"+{choice.CurrentRank * 6}% → +{(choice.CurrentRank + 1) * 6}% spell damage",
        "refine:Rhythm" => $"{choice.CurrentRank * 4}% → {(choice.CurrentRank + 1) * 4}% shorter cast interval",
        "refine:Footwork" => $"+{choice.CurrentRank * 4}% → +{(choice.CurrentRank + 1) * 4}% movement speed",
        "refine:Warding" => $"{choice.CurrentRank * 5}% → {(choice.CurrentRank + 1) * 5}% damage reduction",
        "refine:Vitality" => $"+{choice.CurrentRank * 8} → +{(choice.CurrentRank + 1) * 8} maximum HP • heal 8",
        _ => choice.Description,
    };

    private static string RuneDelta(RunUpgradeId id, int currentRank)
    {
        var nextRank = currentRank + 1;
        return id switch
        {
            RunUpgradeId.Potency => $"Spell damage +{currentRank * 18}% → +{nextRank * 18}%",
            RunUpgradeId.Quickening => $"Cast rate ×{1 + currentRank * 0.12:0.00} → ×{1 + nextRank * 0.12:0.00}",
            RunUpgradeId.Vitality => $"Max health +{currentRank * 18} → +{nextRank * 18} • heal 18",
            RunUpgradeId.Fleetfoot => $"Move speed +{currentRank * 10}% → +{nextRank * 10}%",
            RunUpgradeId.Multicast => currentRank == 0 ? "+1 projectile • damage ×0.90" : "+1 → +2 projectiles • damage ×0.81",
            RunUpgradeId.FrostTouch => FrostTouchDelta(currentRank, nextRank),
            RunUpgradeId.ChainSpark => $"Bonus chains +{currentRank} → +{nextRank}",
            RunUpgradeId.ArcaneEcho => currentRank == 0 ? "Echo every 7 casts at 55% damage" : "Echo every 7 → 5 casts • 55% → 80% damage",
            RunUpgradeId.Bulwark => $"Damage taken ×{DamageTakenMultiplier(nextRank):0.00}",
            RunUpgradeId.Velocity => $"Projectile speed +{currentRank * 20}% → +{nextRank * 20}%",
            RunUpgradeId.Emberbrand => currentRank == 0 ? "Burn every 6 hits • 3.5s" : "Burn every 6 → 4 hits • 3.5 → 4.5s",
            RunUpgradeId.StaticCharge => currentRank == 0 ? "Shock every 7 hits • 3s" : "Shock every 7 → 5 hits • 3 → 4s",
            _ => "Build effect improves",
        };
    }

    private static double DamageTakenMultiplier(int rank) => rank switch
    {
        1 => 0.92,
        2 => 0.84,
        _ => 0.76,
    };

    private static string FrostTouchDelta(int currentRank, int nextRank)
    {
        var hits = 7 - nextRank;
        var duration = 0.65 + nextRank * 0.2;
        return currentRank == 0
            ? $"Adds freeze every {hits} hits • {duration:0.00}s"
            : $"Freeze every {7 - currentRank} → {hits} hits • {duration:0.00}s";
    }

    private static string SpellDelta(SpellId id, int currentRank)
    {
        var spell = SpellCatalog.Get(id);
        var nextRank = currentRank + 1;
        var nextDamage = FocusedCastProfile.CalculateDamage(spell, nextRank);
        var nextCooldown = spell.Ability.CalculateCooldownSeconds(nextRank);
        var effect = SpellEffect(spell, currentRank);
        var prefix = string.IsNullOrEmpty(effect) ? string.Empty : $"{effect} • ";
        if (currentRank == 0) return $"{prefix}{nextDamage:0.#} damage • {nextCooldown:0.00}s interval";

        var currentDamage = FocusedCastProfile.CalculateDamage(spell, currentRank);
        var currentCooldown = spell.Ability.CalculateCooldownSeconds(currentRank);
        return $"{prefix}{currentDamage:0.#} → {nextDamage:0.#} damage • {currentCooldown:0.00} → {nextCooldown:0.00}s";
    }

    private static string SpellEffect(SpellDefinition spell, int currentRank)
    {
        var nextRank = currentRank + 1;
        var current = FocusedCastProfile.For(spell.Id, currentRank);
        var next = FocusedCastProfile.For(spell.Id, nextRank);
        var effects = new List<string>();
        var mastery = nextRank == spell.MaxRank ? spell.Id switch
        {
            SpellId.ArcaneOrb => "Wider bolt",
            SpellId.FrostShard => "Freezing nova",
            SpellId.ChainLightning => "Forked lightning",
            _ => null,
        } : null;
        if (mastery is not null) effects.Add(mastery);
        var pierces = next.BonusPierces - current.BonusPierces + (spell.Id == SpellId.ArcaneOrb && currentRank == 1 ? 1 : 0);
        if (pierces > 0) effects.Add($"Pierce +{pierces}");
        if (next.SplashRadius > current.SplashRadius) effects.Add($"Impact blast {next.SplashRadius:0}");
        if (spell.Ability.Status is { Status: CombatStatusId.Frozen } freeze)
            effects.Add(currentRank == 0 ? $"Freeze {freeze.CalculateDurationSeconds(nextRank):0.00}s"
                : $"Freeze {freeze.CalculateDurationSeconds(currentRank):0.00} → {freeze.CalculateDurationSeconds(nextRank):0.00}s");
        if (spell.Ability.Delivery is ChainAbilityProfile chain)
            effects.Add(currentRank == 0 ? $"{chain.CalculateJumps(nextRank) + next.BonusChains} chain targets"
                : $"{chain.CalculateJumps(currentRank) + current.BonusChains} → {chain.CalculateJumps(nextRank) + next.BonusChains} targets");
        return string.Join(" • ", effects);
    }

    public static string EvolutionSpellName(LevelChoice choice) =>
        SpellCatalog.Get(SpellEvolutionCatalog.Get(ParseEvolution(choice.Id)).Spell).Name;

    private static string EvolutionDelta(SpellEvolutionId id)
    {
        var profile = SpellEvolutionCatalog.Get(id).Profile;
        var effects = new List<string>();
        if (profile.DamageMultiplier != 1) effects.Add($"damage ×{profile.DamageMultiplier:0.00}");
        if (profile.CastIntervalMultiplier < 1) effects.Add($"{(1 / profile.CastIntervalMultiplier - 1):P0} faster");
        if (profile.CastIntervalMultiplier > 1) effects.Add($"{(profile.CastIntervalMultiplier - 1):P0} slower");
        if (profile.ExtraProjectiles > 0) effects.Add($"+{profile.ExtraProjectiles} projectiles");
        if (profile.BonusPierces > 0) effects.Add($"+{profile.BonusPierces} pierce");
        if (profile.BonusChains > 0) effects.Add($"+{profile.BonusChains} chains");
        if (profile.SplashRadius > 0) effects.Add($"{profile.SplashRadius:0} splash");
        if (profile.FrostNovaRadius > 0) effects.Add($"{profile.FrostNovaRadius:0} nova");
        if (profile.StatusDurationMultiplier > 1) effects.Add($"status ×{profile.StatusDurationMultiplier:0.00}");
        if (profile.BonusStatusStacks > 0) effects.Add($"+{profile.BonusStatusStacks} status stack");
        return string.Join(" • ", effects.Take(4));
    }

    private static string SynergyDelta(SynergyId id)
    {
        var synergy = SynergyCatalog.Get(id);
        return string.Join(" + ", synergy.RequiredSpells.Select(spellId => SpellCatalog.Get(spellId).Name));
    }

    private static RunUpgradeId ParseRunUpgrade(string id) => Enum.Parse<RunUpgradeId>(id[5..]);
    private static SpellId ParseSpell(string id) => Enum.Parse<SpellId>(id[6..]);
    private static SpellEvolutionId ParseEvolution(string id) => Enum.Parse<SpellEvolutionId>(id[10..]);
    private static SynergyId ParseSynergy(string id) => Enum.Parse<SynergyId>(id[8..]);

    private static string Roman(int value) => value switch
    {
        1 => "I",
        2 => "II",
        3 => "III",
        4 => "IV",
        5 => "V",
        _ => value.ToString(),
    };
}
