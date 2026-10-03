namespace Wyrmforge.Domain.Spells;

public sealed class SpellBook
{
    private readonly Dictionary<SpellId, int> ranks = new()
    {
        [SpellId.ArcaneOrb] = 1,
        [SpellId.FireBolt] = 0,
        [SpellId.FrostShard] = 0,
        [SpellId.ChainLightning] = 0,
    };

    public int this[SpellId id] => ranks[id];

    public int LearnedCount => ranks.Count(pair => pair.Value > 0);

    public bool LearnOrUpgrade(SpellId id)
    {
        var definition = SpellCatalog.Get(id);
        if (ranks[id] >= definition.MaxRank) return false;
        ranks[id]++;
        return true;
    }

    public IReadOnlyDictionary<SpellId, int> Snapshot() => new Dictionary<SpellId, int>(ranks);
}
