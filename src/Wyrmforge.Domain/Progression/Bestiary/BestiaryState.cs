using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Domain.Progression.Bestiary;

/// <summary>One creature's lifetime record in the save.</summary>
public sealed record BestiarySaveEntry(string Kind, int Kills);

public sealed record BestiarySave(IReadOnlyList<BestiarySaveEntry> Entries, IReadOnlyList<string> Elites);

/// <summary>What a single hunt added to the book.</summary>
public sealed record BestiaryRunResult(IReadOnlyList<EnemyKind> NewCreatures, IReadOnlyList<EliteAffix> NewElites)
{
    public bool HasDiscoveries => NewCreatures.Count > 0 || NewElites.Count > 0;
}

/// <summary>Encountered Enemies collection: which creatures the hunter has met, how many fell, and which elites were slain.</summary>
public sealed class BestiaryState
{
    private readonly Dictionary<EnemyKind, int> kills = [];
    private readonly HashSet<EliteAffix> elites = [];

    public int EncounteredCount => kills.Count;

    public bool Encountered(EnemyKind kind) => kills.ContainsKey(kind);

    public int Kills(EnemyKind kind) => kills.GetValueOrDefault(kind);

    public bool EliteSlain(EliteAffix affix) => elites.Contains(affix);

    // A unique creature (the Reliquary) gives up its secrets in a single kill; nobody meets one fifty times.
    public bool HunterNoteRevealed(EnemyKind kind) => Kills(kind) >= HunterNoteKillsFor(kind);

    public bool Studied(EnemyKind kind) => Kills(kind) >= (IsUnique(kind) ? 1 : BestiaryCatalog.StudiedKills);

    /// <summary>Kills that reveal this creature's hunter note: one for a unique, the catalog threshold otherwise.</summary>
    public static int HunterNoteKillsFor(EnemyKind kind) => IsUnique(kind) ? 1 : BestiaryCatalog.HunterNoteKills;

    public static bool IsUnique(EnemyKind kind) => Enum.IsDefined(kind) && EnemyCatalog.Get(kind).Unique;

    private static bool IsCreature(EnemyKind kind) => Enum.IsDefined(kind) && EnemyCatalog.Get(kind).IsCreature;

    /// <summary>Merges a finished hunt. Kinds met but never killed still count as encountered.</summary>
    public BestiaryRunResult Record(IEnumerable<(EnemyKind Kind, int Kills)> encounters, IEnumerable<EliteAffix> elitesSlain)
    {
        ArgumentNullException.ThrowIfNull(encounters);
        ArgumentNullException.ThrowIfNull(elitesSlain);
        var newCreatures = new List<EnemyKind>();
        foreach (var (kind, count) in encounters)
        {
            if (!IsCreature(kind)) continue;
            if (!kills.ContainsKey(kind)) newCreatures.Add(kind);
            kills[kind] = SafeAdd(kills.GetValueOrDefault(kind), Math.Max(0, count));
        }

        var newElites = new List<EliteAffix>();
        foreach (var affix in elitesSlain)
        {
            if (affix == EliteAffix.None || !Enum.IsDefined(affix)) continue;
            var kind = EliteAffixCatalog.Get(affix).Kind;
            if (kills.TryAdd(kind, 0)) newCreatures.Add(kind);
            if (elites.Add(affix)) newElites.Add(affix);
        }

        return new BestiaryRunResult(newCreatures, newElites);
    }

    public BestiarySave Snapshot() => new(
        kills.OrderBy(entry => entry.Key).Select(entry => new BestiarySaveEntry(entry.Key.ToString(), entry.Value)).ToArray(),
        elites.Order().Select(affix => affix.ToString()).ToArray());

    /// <summary>Restores a save, ignoring unknown names (renamed or removed creatures) and negative counts.</summary>
    public void Restore(BestiarySave? save)
    {
        kills.Clear();
        elites.Clear();
        if (save is null) return;
        foreach (var entry in save.Entries ?? [])
        {
            if (entry is null || !Enum.TryParse<EnemyKind>(entry.Kind, out var kind) || !IsCreature(kind)) continue;
            kills[kind] = SafeAdd(kills.GetValueOrDefault(kind), Math.Max(0, entry.Kills));
        }
        foreach (var name in save.Elites ?? [])
        {
            if (!Enum.TryParse<EliteAffix>(name, out var affix) || affix == EliteAffix.None || !Enum.IsDefined(affix)) continue;
            elites.Add(affix);
            kills.TryAdd(EliteAffixCatalog.Get(affix).Kind, 0);
        }
    }

    private static int SafeAdd(int current, int count) => (int)Math.Min(int.MaxValue, (long)current + count);
}
