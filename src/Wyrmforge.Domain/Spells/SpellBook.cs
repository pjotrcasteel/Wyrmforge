namespace Wyrmforge.Domain.Spells;

public sealed class SpellBook
{
    private readonly Dictionary<SpellId, int> ranks = SpellCatalog.All.ToDictionary(spell => spell.Id, spell => spell.Id == SpellId.ArcaneOrb ? 1 : 0);

    public int this[SpellId id] => ranks[id];

    public SpellId ActiveSpell { get; private set; } = SpellId.ArcaneOrb;

    // The player commits to one primary before entering the first trail.
    // Supporting schools are acquired via combinations rather than wasting ranks on pivots.
    public bool IsPrimaryCommitted { get; private set; }

    public bool TryChoosePrimary(SpellId id)
    {
        if (IsPrimaryCommitted || !ranks.ContainsKey(id)) return false;
        if (id != SpellId.ArcaneOrb) ranks[SpellId.ArcaneOrb] = 0;
        if (ranks[id] == 0) ranks[id] = 1;
        ActiveSpell = id;
        IsPrimaryCommitted = true;
        return true;
    }

    public bool TryFocus(SpellId id)
    {
        if (IsPrimaryCommitted || !ranks.TryGetValue(id, out var rank) || rank <= 0 || id == ActiveSpell) return false;
        ActiveSpell = id;
        return true;
    }

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
