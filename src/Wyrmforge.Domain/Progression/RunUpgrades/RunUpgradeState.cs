namespace Wyrmforge.Domain.Progression.RunUpgrades;

public sealed class RunUpgradeState
{
    private readonly Dictionary<RunUpgradeId, int> ranks = Enum.GetValues<RunUpgradeId>().ToDictionary(id => id, _ => 0);

    public int this[RunUpgradeId id] => ranks[id];

    public bool Apply(RunUpgradeId id)
    {
        var definition = RunUpgradeCatalog.Get(id);
        if (ranks[id] >= definition.MaxRank) return false;
        ranks[id]++;
        return true;
    }

    public IReadOnlyDictionary<RunUpgradeId, int> Snapshot() => new Dictionary<RunUpgradeId, int>(ranks);
}
