namespace Wyrmforge.Domain.Progression.DragonEssences;

public sealed class DragonEssenceVault
{
    private readonly List<DragonEssenceId> securedEssences = [];

    public IReadOnlyList<DragonEssenceId> SecuredEssences => securedEssences.ToArray();

    public int TotalCount => securedEssences.Count;

    public int Count(DragonEssenceId id) => securedEssences.Count(essence => essence == id);

    public void Store(DragonEssenceId id) => securedEssences.Add(id);

    public void Restore(IEnumerable<DragonEssenceId> essences)
    {
        ArgumentNullException.ThrowIfNull(essences);
        securedEssences.Clear();
        securedEssences.AddRange(essences);
    }
}
