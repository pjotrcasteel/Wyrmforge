namespace Wyrmforge.Domain.Progression.Signature;

/// <summary>
/// Versioned, presentation-only projection of the already validated Fireball loadout.
/// This never authorizes a mutation or changes damage, targets, collision or unlocks.
/// </summary>
public sealed record FireballVisualRecipe(int Version, int Level, int MutationMask)
{
    public const int CurrentVersion = 1;

    public bool Has(FireballMutationId mutation) =>
        Enum.IsDefined(mutation) && (MutationMask & (1 << ((int)mutation - 1))) != 0;

    // No visual shape or material is chosen here: production art is not approved.
    // A future authored renderer can interpret only the effects actually present.
    public bool Detonation => Has(FireballMutationId.Detonation);
    public bool ScorchedEarth => Has(FireballMutationId.ScorchedEarth);

    public string CacheKey => $"fireball-v{Version}-l{Level}-m{MutationMask:x3}";

    public static FireballVisualRecipe Resolve(FireballCoreState core)
    {
        ArgumentNullException.ThrowIfNull(core);
        return Resolve(core.Level, core.Equipped);
    }

    public static FireballVisualRecipe Resolve(int level, IEnumerable<FireballMutationId> equipped)
    {
        ArgumentNullException.ThrowIfNull(equipped);
        var allowed = Math.Clamp(level, 1, 5);
        var mask = 0;
        // The caller owns actual equipped capacity and research; a prepared Hunt
        // can also be loaded directly by test/legacy callers. Never silently drop
        // an active gameplay effect merely because a visual level is lower.
        // Bit positions use stable enum values, independent of socket ordering.
        foreach (var mutation in equipped
            .Where(id => FireballCoreCatalog.Mutations.Any(item => item.Id == id && item.Playable))
            .Distinct().Take(5))
        {
            mask |= 1 << ((int)mutation - 1);
        }
        return new(CurrentVersion, allowed, mask);
    }
}
