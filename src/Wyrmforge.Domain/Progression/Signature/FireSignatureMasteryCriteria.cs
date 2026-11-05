namespace Wyrmforge.Domain.Progression.Signature;

/// <summary>
/// Permanent Fireball milestones used by Mastery and Great Hunt. They do not grant damage,
/// mutators, or sockets: those remain earned through the Arcane Nexus.
/// </summary>
public static class FireSignatureMasteryCriteria
{
    public const int MeaningfulRunLevel = 2;
    public const int MeaningfulRunMutations = 1;
    public const int EmpoweredDuelLevel = 3;
    public const int EmpoweredDuelMutations = 2;

    public static bool QualifiesMeaningfulRun(int level, IEnumerable<FireballMutationId> equipped) =>
        HasPreparedBuild(level, equipped, MeaningfulRunLevel, MeaningfulRunMutations);

    public static bool QualifiesEmpoweredDuel(int level, IEnumerable<FireballMutationId> equipped) =>
        HasPreparedBuild(level, equipped, EmpoweredDuelLevel, EmpoweredDuelMutations);

    private static bool HasPreparedBuild(int level, IEnumerable<FireballMutationId> equipped, int requiredLevel, int requiredMutations)
    {
        ArgumentNullException.ThrowIfNull(equipped);
        return level is >= 1 and <= 5 && level >= requiredLevel && equipped.Distinct().Count() >= requiredMutations;
    }
}
