using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Presentation.Web.Features.LevelUp;

public static class LevelChoicePresentation
{
    public static string KindClass(LevelChoice choice) => choice.Kind switch
    {
        LevelChoiceKind.Rune => "rune",
        LevelChoiceKind.NewSpell => "new-spell",
        LevelChoiceKind.SpellUpgrade => "spell-upgrade",
        _ => "synergy",
    };

    public static string RarityClass(LevelChoice choice) => choice.Rarity.ToString().ToLowerInvariant();

    public static string Badge(LevelChoice choice) => choice.Kind switch
    {
        LevelChoiceKind.Rune => "RUNE",
        LevelChoiceKind.NewSpell => "NEW SPELL",
        LevelChoiceKind.SpellUpgrade => "SPELL UPGRADE",
        _ => "SYNERGY",
    };

    public static string Rank(LevelChoice choice)
    {
        if (choice.Kind == LevelChoiceKind.Synergy) return "NEW INTERACTION";
        if (choice.Kind == LevelChoiceKind.NewSpell) return "RANK I";
        if (choice.CurrentRank == 0) return $"RANK I / {Roman(choice.MaxRank)}";
        return $"{Roman(choice.CurrentRank)} → {Roman(choice.CurrentRank + 1)}";
    }

    public static string Delta(LevelChoice choice)
    {
        if (choice.Kind == LevelChoiceKind.Rune) return RuneDelta(ParseRunUpgrade(choice.Id), choice.CurrentRank);
        if (choice.Kind is LevelChoiceKind.NewSpell or LevelChoiceKind.SpellUpgrade) return SpellDelta(ParseSpell(choice.Id), choice.CurrentRank);
        return SynergyDelta(ParseSynergy(choice.Id));
    }

    public static string Footer(LevelChoice choice) => choice.Kind switch
    {
        LevelChoiceKind.Rune => "TEMPORARY • THIS RUN ONLY",
        LevelChoiceKind.NewSpell => "TEMPORARY • ADDS A SPELL",
        LevelChoiceKind.SpellUpgrade => "TEMPORARY • DEEPENS A SPELL",
        _ => "TEMPORARY • CHANGES INTERACTIONS",
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
        var nextDamage = spell.Ability.CalculateDamage(nextRank);
        var nextCooldown = spell.Ability.CalculateCooldownSeconds(nextRank);
        var mastery = nextRank == spell.MaxRank ? " • MASTERY RANK" : string.Empty;
        if (currentRank == 0) return $"{nextDamage:0.#} damage • {nextCooldown:0.00}s interval{mastery}";

        var currentDamage = spell.Ability.CalculateDamage(currentRank);
        var currentCooldown = spell.Ability.CalculateCooldownSeconds(currentRank);
        return $"{currentDamage:0.#} → {nextDamage:0.#} damage • {currentCooldown:0.00} → {nextCooldown:0.00}s{mastery}";
    }

    private static string SynergyDelta(SynergyId id)
    {
        var synergy = SynergyCatalog.Get(id);
        return string.Join(" + ", synergy.RequiredSpells.Select(spellId => SpellCatalog.Get(spellId).Name));
    }

    private static RunUpgradeId ParseRunUpgrade(string id) => Enum.Parse<RunUpgradeId>(id[5..]);
    private static SpellId ParseSpell(string id) => Enum.Parse<SpellId>(id[6..]);
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
