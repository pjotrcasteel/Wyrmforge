namespace Wyrmforge.Domain.Spells.Synergies;

public sealed class SynergySelection
{
    private readonly HashSet<SynergyId> selected = [];

    public int Count => selected.Count;

    public bool Contains(SynergyId id) => selected.Contains(id);

    public bool IsAvailable(SynergyId id, SpellBook spellBook)
    {
        var synergy = SynergyCatalog.Get(id);
        return !selected.Contains(id) && synergy.RequiredSpells.All(spellId => spellBook[spellId] > 0);
    }

    public bool Select(SynergyId id, SpellBook spellBook)
    {
        if (!IsAvailable(id, spellBook)) return false;
        return selected.Add(id);
    }

    public IReadOnlySet<SynergyId> Snapshot() => new HashSet<SynergyId>(selected);
}
