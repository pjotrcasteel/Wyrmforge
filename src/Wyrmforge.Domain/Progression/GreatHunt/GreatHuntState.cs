using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Forge;
using Wyrmforge.Domain.Progression.SpellMastery;

namespace Wyrmforge.Domain.Progression.GreatHunt;

public sealed record GreatHuntEntry(DragonId Wyrm, bool Slain, bool EssenceSecured, bool DeepEvolvedDuel)
{
    public bool AscendantDefeated { get; init; }
    public int Feats => (Slain ? 1 : 0) + (EssenceSecured ? 1 : 0) + (DeepEvolvedDuel ? 1 : 0);
}

public sealed record GreatHuntRunEvidence(int CompletedRoutes, bool Abandoned, IReadOnlySet<DragonId> DefeatedWyrms,
    IReadOnlySet<DragonId> DeepEvolvedDuels, IReadOnlyList<DragonEssenceId> SecuredEssences)
{
    public IReadOnlySet<DragonId> AscendantVictories { get; init; } = new HashSet<DragonId>();
}

public sealed class GreatHuntState
{
    private readonly Dictionary<DragonId, GreatHuntEntry> entries = [];

    public GreatHuntEntry Get(DragonId wyrm) => entries.TryGetValue(wyrm, out var value) ? value : new GreatHuntEntry(wyrm, false, false, false);

    public IReadOnlyList<GreatHuntEntry> Snapshot() => entries.Values.OrderBy(entry => entry.Wyrm).ToArray();

    public int CompletedCount(SpellMasteryState mastery) => GreatHuntCatalog.All.Count(oath => IsSealed(oath.Wyrm, mastery));

    public bool IsSealed(DragonId wyrm, SpellMasteryState mastery)
    {
        ArgumentNullException.ThrowIfNull(mastery);
        var oath = GreatHuntCatalog.Get(wyrm);
        var entry = Get(wyrm);
        return entry.Feats == 3 && mastery.Get(oath.LineageSpell).Unlocked;
    }

    public IReadOnlyList<DragonId> RecordRun(GreatHuntRunEvidence evidence)
    {
        ArgumentNullException.ThrowIfNull(evidence);
        if (evidence.Abandoned || evidence.CompletedRoutes < 1) return [];

        var advanced = new List<DragonId>();
        foreach (var oath in GreatHuntCatalog.All)
        {
            var current = Get(oath.Wyrm);
            var slain = evidence.DefeatedWyrms.Contains(oath.Wyrm);
            var essence = evidence.SecuredEssences.Any(id => DragonEssenceCatalog.ChoicesFor(oath.Wyrm).Any(choice => choice.Id == id));
            var duel = slain && evidence.DeepEvolvedDuels.Contains(oath.Wyrm);
            var updated = current with
            {
                Slain = current.Slain || slain,
                EssenceSecured = current.EssenceSecured || essence,
                DeepEvolvedDuel = current.DeepEvolvedDuel || duel,
                AscendantDefeated = current.AscendantDefeated || (oath.Wyrm == DragonId.Ashfang && evidence.AscendantVictories.Contains(oath.Wyrm)),
            };
            if (updated == current) continue;
            entries[oath.Wyrm] = updated;
            advanced.Add(oath.Wyrm);
        }

        return advanced;
    }

    public bool ReconcileForgeHistory(ForgeProgressionState forge)
    {
        ArgumentNullException.ThrowIfNull(forge);
        var changed = false;
        foreach (var oath in GreatHuntCatalog.All.Where(oath => forge.Contains(oath.ForgeLineage)))
        {
            var previous = Get(oath.Wyrm);
            if (previous.Slain && previous.EssenceSecured) continue;
            entries[oath.Wyrm] = previous with { Slain = true, EssenceSecured = true };
            changed = true;
        }

        return changed;
    }

    public bool ReconcileMasteryHistory(SpellMasteryState mastery)
    {
        ArgumentNullException.ThrowIfNull(mastery);
        var changed = false;
        foreach (var oath in GreatHuntCatalog.All.Where(oath => mastery.Get(oath.LineageSpell).WyrmFeat))
        {
            var previous = Get(oath.Wyrm);
            if (previous.Slain) continue;
            entries[oath.Wyrm] = previous with { Slain = true };
            changed = true;
        }

        return changed;
    }

    public void Restore(IEnumerable<GreatHuntEntry> saved)
    {
        ArgumentNullException.ThrowIfNull(saved);
        entries.Clear();
        foreach (var entry in saved)
        {
            if (!GreatHuntCatalog.All.Any(oath => oath.Wyrm == entry.Wyrm)) continue;
            entries[entry.Wyrm] = entry;
        }
    }
}
