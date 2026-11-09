using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.LevelUp;

/// <summary>Temporary breakthroughs share the ordinary draft and Fateweave eligibility path.</summary>
public static class FireHuntBreakthroughs
{
    // Candidate milestone pacing; these are tunable, not permanent balance promises.
    public const int MegaLevel = 10;
    public const int EvolutionLevel = 15;

    public static bool IsBreakthrough(RunUpgradeId id) => id is RunUpgradeId.CinderCascade or RunUpgradeId.SolarWake;

    public static bool CanOffer(RunBuildState build, RunUpgradeId id, int level) =>
        build.Spells.ActiveSpell == SpellId.FireBolt && PowerMilestoneProfile.IsMajorLevel(level)
        && build.RunUpgrades[id] == 0 && id switch
        {
            RunUpgradeId.CinderCascade => level >= MegaLevel && build.RunUpgrades[RunUpgradeId.Emberbrand] > 0,
            RunUpgradeId.SolarWake => level >= EvolutionLevel && build.RunUpgrades[RunUpgradeId.CinderCascade] > 0
                && build.PreparedFireballLevel >= 2 && build.PreparedFireballMutations.Count > 0,
            _ => false,
        };
}
