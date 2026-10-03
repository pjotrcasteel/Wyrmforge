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

    public static string Badge(LevelChoice choice) => choice.Kind switch
    {
        LevelChoiceKind.Rune => "RUNE",
        LevelChoiceKind.NewSpell => "NEW SPELL",
        LevelChoiceKind.SpellUpgrade => "SPELL UPGRADE",
        _ => "SYNERGY",
    };

    public static string Action(LevelChoice choice) => choice.Kind switch
    {
        LevelChoiceKind.Rune => "STRENGTHEN",
        LevelChoiceKind.NewSpell => "LEARN",
        LevelChoiceKind.SpellUpgrade => "UPGRADE",
        _ => "DISCOVER",
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
        LevelChoiceKind.Rune => "STRENGTHENS THIS RUN",
        LevelChoiceKind.NewSpell => "ADDS A NEW SPELL",
        LevelChoiceKind.SpellUpgrade => "IMPROVES AN EXISTING SPELL",
        _ => "CHANGES HOW SPELLS INTERACT",
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
            RunUpgradeId.Multicast => $"Extra projectiles +{currentRank} → +{nextRank} • projectile damage ×0.90",
            RunUpgradeId.FrostTouch => FrostTouchDelta(currentRank, nextRank),
            RunUpgradeId.ChainSpark => $"Bonus chains +{currentRank} → +{nextRank}",
            _ => currentRank == 0 ? "Echo every 7 casts at 55% damage" : "Echo every 7 → 5 casts • 55% → 80% damage",
        };
    }

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
        var nextRank = currentRank + 1;
        return id switch
        {
            SpellId.ArcaneOrb => ProjectileSpellDelta(18, 0.28, currentRank, nextRank, " • casts faster"),
            SpellId.FireBolt => FireBoltDelta(currentRank, nextRank),
            SpellId.FrostShard => FrostShardDelta(currentRank, nextRank),
            _ => ChainLightningDelta(currentRank, nextRank),
        };
    }

    private static string ProjectileSpellDelta(double baseDamage, double growth, int currentRank, int nextRank, string suffix)
    {
        var nextDamage = Math.Round(baseDamage * (1 + (nextRank - 1) * growth));
        if (currentRank == 0) return $"{nextDamage:0} damage{suffix}";
        var currentDamage = Math.Round(baseDamage * (1 + (currentRank - 1) * growth));
        return $"{currentDamage:0} → {nextDamage:0} damage{suffix}";
    }

    private static string FireBoltDelta(int currentRank, int nextRank)
    {
        var suffix = nextRank == 3 ? " • unlocks impact blast" : string.Empty;
        return ProjectileSpellDelta(30, 0.3, currentRank, nextRank, suffix);
    }

    private static string FrostShardDelta(int currentRank, int nextRank)
    {
        var nextDamage = Math.Round(12 * (1 + (nextRank - 1) * 0.25));
        var nextFreeze = 0.35 + nextRank * 0.18;
        if (currentRank == 0) return $"{nextDamage:0} damage • freezes {nextFreeze:0.00}s";
        var currentDamage = Math.Round(12 * (1 + (currentRank - 1) * 0.25));
        var currentFreeze = 0.35 + currentRank * 0.18;
        return $"{currentDamage:0} → {nextDamage:0} damage • freeze {currentFreeze:0.00} → {nextFreeze:0.00}s";
    }

    private static string ChainLightningDelta(int currentRank, int nextRank)
    {
        var nextDamage = 15 + (nextRank - 1) * 5;
        if (currentRank == 0) return $"{nextDamage} damage • {nextRank + 1} base jumps";
        var currentDamage = 15 + (currentRank - 1) * 5;
        return $"{currentDamage} → {nextDamage} damage • {currentRank + 1} → {nextRank + 1} base jumps";
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
