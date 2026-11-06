namespace Wyrmforge.Domain.Progression.Signature;

/// <summary>
/// Permanent Fireball milestones used by Mastery and Great Hunt. They do not grant damage,
/// mutators, or sockets: those remain earned through the Arcane Nexus.
/// </summary>
public static class FireSignatureMasteryCriteria
{
    public const int MeaningfulRunRoutes = 3;
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
        var active = equipped.ToArray();
        var available = FireballCoreCatalog.Mutations.Where(mutation => mutation.Playable).Select(mutation => mutation.Id).ToHashSet();

        return level is >= 1 and <= 5
            && level >= requiredLevel
            && active.Length >= requiredMutations
            && active.Length <= FireballCoreCatalog.SocketCapacityForLevel(level)
            && active.Distinct().Count() == active.Length
            && active.All(available.Contains);
    }
}
