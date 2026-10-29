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
        var activeSchool = SpellCatalog.Get(build.Spells.ActiveSpell).School;
        return choice.Kind switch
        {
            // The Nexus owns spell ranks, evolutions and school combinations.
            // Temporary major powers are the only legal Hunt breakthroughs.
            LevelChoiceKind.SchoolPower => choice.Id == $"power:{activeSchool}",
            LevelChoiceKind.Rune => choice.Id.StartsWith("rune:", StringComparison.Ordinal)
                && Enum.TryParse<RunUpgradeId>(choice.Id.AsSpan("rune:".Length), out var rune)
                && IsMajorRune(rune)
                && (Telemetry.ChoiceSchools.RuneSchool(rune) is not { } affinity || affinity == activeSchool),
            _ => false,
        };
    }

    public static bool IsMajorRune(RunUpgradeId id) => id is
        RunUpgradeId.Potency or RunUpgradeId.Multicast or RunUpgradeId.ArcaneEcho or RunUpgradeId.FrostTouch or RunUpgradeId.ChainSpark
        or RunUpgradeId.Emberbrand or RunUpgradeId.StaticCharge;
}
