namespace Wyrmforge.Domain.Spells.Evolutions;

public sealed class SpellEvolutionSelection
{
    private readonly Dictionary<SpellId, SpellEvolutionId> selected = [];

    public int Count => selected.Count;

    public SpellEvolutionId? For(SpellId spell) => selected.TryGetValue(spell, out var id) ? id : null;

    public bool Contains(SpellEvolutionId id) => selected.Values.Contains(id);

    public bool IsAvailable(SpellEvolutionId id, SpellBook spellBook)
    {
        var definition = SpellEvolutionCatalog.Get(id);
        var spell = SpellCatalog.Get(definition.Spell);
        return spellBook[definition.Spell] >= spell.MaxRank && !selected.ContainsKey(definition.Spell);
    }

    public bool Select(SpellEvolutionId id, SpellBook spellBook)
    {
        if (!IsAvailable(id, spellBook)) return false;
        return selected.TryAdd(SpellEvolutionCatalog.Get(id).Spell, id);
    }

    public IReadOnlyDictionary<SpellId, SpellEvolutionId> Snapshot() => new Dictionary<SpellId, SpellEvolutionId>(selected);
}
