using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.RunUpgrades;

public sealed record RunUpgradeDefinition(RunUpgradeId Id, string Name, string Description, string Icon, IReadOnlyList<BuildModifierProfile> RankProfiles)
{
    public int MaxRank => RankProfiles.Count;

    public BuildModifierProfile ProfileForRank(int rank)
    {
        if (rank == 0) return BuildModifierProfile.Empty;
        if (rank < 0 || rank > MaxRank) throw new ArgumentOutOfRangeException(nameof(rank));
        return RankProfiles[rank - 1];
    }
}
