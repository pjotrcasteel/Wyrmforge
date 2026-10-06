namespace Wyrmforge.Domain.Spells;

public sealed class SpellBook
{
    private readonly Dictionary<SpellId, int> ranks = SpellCatalog.All.ToDictionary(spell => spell.Id, spell => spell.Id == SpellId.ArcaneOrb ? 1 : 0);

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
