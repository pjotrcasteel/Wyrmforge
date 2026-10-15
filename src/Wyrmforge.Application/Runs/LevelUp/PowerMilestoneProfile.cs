using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.LevelUp;

// Level rewards are earned when transitioning from current level N to N+1;
// bonus trail attunements never count as five-level milestones.
public static class PowerMilestoneProfile
{
    public static bool IsMajorLevel(int level) => level >= 5 && level % 5 == 0;
    public static bool CanEvolve(int level, int primaryRank) => level >= 15 && IsMajorLevel(level) && primaryRank >= 3;

    public static bool IsMajorChoice(RunBuildState build, LevelChoice choice, int level)
    {
        if (!IsMajorLevel(level)) return false;
        return choice.Kind switch
        {
            LevelChoiceKind.SpellUpgrade => choice.Id == $"spell:{build.Spells.ActiveSpell}"
                && build.Spells[build.Spells.ActiveSpell] > 0
                && build.Spells[build.Spells.ActiveSpell] < SpellCatalog.Get(build.Spells.ActiveSpell).MaxRank
                && level >= build.Spells[build.Spells.ActiveSpell] * 5,
            LevelChoiceKind.Synergy => level >= 10 && build.Spells[build.Spells.ActiveSpell] >= 2,
            LevelChoiceKind.Evolution => CanEvolve(level, build.Spells[build.Spells.ActiveSpell])
                && choice.Id.StartsWith("evolution:", StringComparison.Ordinal),
            LevelChoiceKind.Rune => choice.Id.StartsWith("rune:", StringComparison.Ordinal)
                && Enum.TryParse<RunUpgradeId>(choice.Id.AsSpan("rune:".Length), out var rune)
                && IsMajorRune(rune),
            _ => false,
        };
    }

    public static bool IsMajorRune(RunUpgradeId id) => id is
        RunUpgradeId.Multicast or RunUpgradeId.ArcaneEcho or RunUpgradeId.FrostTouch or RunUpgradeId.ChainSpark
        or RunUpgradeId.Emberbrand or RunUpgradeId.StaticCharge;
}
