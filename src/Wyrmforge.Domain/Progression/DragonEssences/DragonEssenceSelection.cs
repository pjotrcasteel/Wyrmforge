namespace Wyrmforge.Domain.Progression.DragonEssences;

public sealed class DragonEssenceSelection
{
    private readonly HashSet<DragonEssenceId> selected = [];

    public IReadOnlySet<DragonEssenceId> Selected => new HashSet<DragonEssenceId>(selected);

    public int Count => selected.Count;

    public bool Contains(DragonEssenceId id) => selected.Contains(id);

    public bool Select(DragonEssenceId id) => selected.Add(id);
}
