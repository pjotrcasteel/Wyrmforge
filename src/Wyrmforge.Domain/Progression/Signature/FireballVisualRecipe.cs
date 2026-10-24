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
        // The caller owns equipped capacity and research. Only supported effects may be represented.
        // Bit positions are the existing stable enum values; socket order never changes art identity.
        foreach (var mutation in equipped.Distinct().Take(5))
        {
            if (!FireballCoreCatalog.Mutations.Any(item => item.Id == mutation && item.Playable)) continue;
            mask |= 1 << ((int)mutation - 1);
        }
        return new(CurrentVersion, allowed, mask);
    }
}
