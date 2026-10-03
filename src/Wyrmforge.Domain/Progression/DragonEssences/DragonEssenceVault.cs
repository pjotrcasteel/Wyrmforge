namespace Wyrmforge.Domain.Progression.DragonEssences;

public sealed class DragonEssenceVault
{
    private readonly List<DragonEssenceId> securedEssences = [];

    public IReadOnlyList<DragonEssenceId> SecuredEssences => securedEssences.ToArray();

    public int TotalCount => securedEssences.Count;

    public int Count(DragonEssenceId id) => securedEssences.Count(essence => essence == id);

    public void Store(DragonEssenceId id) => securedEssences.Add(id);

    public bool Consume(DragonEssenceId id)
    {
        var index = securedEssences.IndexOf(id);
        if (index < 0) return false;
        securedEssences.RemoveAt(index);
        return true;
    }

    public void Restore(IEnumerable<DragonEssenceId> essences)
    {
        ArgumentNullException.ThrowIfNull(essences);
        securedEssences.Clear();
        securedEssences.AddRange(essences);
    }
}
