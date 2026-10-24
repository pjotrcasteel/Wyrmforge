namespace Wyrmforge.Domain.Progression.Signature;

/// <summary>
/// Immutable mechanical identity of currently equipped, implemented Fireball
/// mutations. The Arcane Nexus owns research/socket validation; this is only a
/// bounded projection of effects actually prepared for a Hunt. VFX cannot
/// grant mutations or create damage.
/// </summary>
public readonly record struct FireballMutationSet(int Mask)
{
    public bool Has(FireballMutationId id) =>
        Enum.IsDefined(id) && (Mask & (1 << ((int)id - 1))) != 0;

    public static FireballMutationSet Resolve(IEnumerable<FireballMutationId> equipped)
    {
        ArgumentNullException.ThrowIfNull(equipped);
        var mask = 0;
        var count = 0;
        foreach (var id in equipped.Distinct())
        {
            if (!FireballCoreCatalog.Mutations.Any(item => item.Id == id && item.Playable)) continue;
            mask |= 1 << ((int)id - 1);
            if (++count == 5) break;
        }
        return new(mask);
    }
}
