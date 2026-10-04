namespace Wyrmforge.Domain.Progression.Relics;

public sealed class RelicInventoryState
{
    public const int MaxEquipped = 2;

    private readonly HashSet<RelicId> owned = [];
    private readonly List<RelicId> equipped = [];

    public IReadOnlyList<RelicId> Owned => owned.OrderBy(id => id).ToArray();
    public IReadOnlyList<RelicId> Equipped => equipped.ToArray();
    public bool HasFreeSlot => equipped.Count < MaxEquipped;

    public bool IsOwned(RelicId id) => owned.Contains(id);

    public bool IsEquipped(RelicId id) => equipped.Contains(id);

    public bool Acquire(RelicId id) => owned.Add(id);

    public bool TryEquip(RelicId id)
    {
        if (!owned.Contains(id) || equipped.Contains(id) || !HasFreeSlot) return false;
        equipped.Add(id);
        return true;
    }

    public bool TryUnequip(RelicId id) => equipped.Remove(id);
}
