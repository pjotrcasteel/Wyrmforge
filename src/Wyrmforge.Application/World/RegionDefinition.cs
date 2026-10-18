using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.World;

namespace Wyrmforge.Application.World;

public enum RegionStatus
{
    /// <summary>Hunts run here today.</summary>
    Playable,
    /// <summary>Charted on paper: discipline, lineage and concept roster are known, but no hunt content exists yet.</summary>
    Planned,
}

/// <summary>How strongly a Wyrm lineage reaches into a region. A region may host several; a Wyrm may touch several regions.</summary>
public enum WyrmInfluence
{
    Absent,
    /// <summary>The lineage hunts here and can answer a hunt's resonance.</summary>
    Present,
    /// <summary>The region's own Wyrm: its visible influence, and the culmination of a region's first hunt.</summary>
    Home,
}

public enum RegionAccessKind
{
    Open,
    FirstHuntComplete,
    HunterLevel,
    WyrmSlain,
    /// <summary>No hunt content yet. Closed for everyone, whichever path they took.</summary>
    NotYetAuthored,
}

/// <summary>
/// Access is earned in the world, never by story progress alone (amendment §6): a free explorer and a campaign player meet
/// the same conditions. Exact thresholds for future regions are open questions (§14).
/// </summary>
public sealed record RegionAccessRule(RegionAccessKind Kind, int HunterLevel = 0, DragonId? Wyrm = null)
{
    public static RegionAccessRule Open { get; } = new(RegionAccessKind.Open);
    public static RegionAccessRule NotYetAuthored { get; } = new(RegionAccessKind.NotYetAuthored);

    public bool IsMet(RegionAccessContext context)
    {
        ArgumentNullException.ThrowIfNull(context);
        return Kind switch
        {
            RegionAccessKind.Open => true,
            RegionAccessKind.FirstHuntComplete => context.FirstHuntComplete,
            RegionAccessKind.HunterLevel => context.HunterLevel >= HunterLevel,
            RegionAccessKind.WyrmSlain => Wyrm is { } wyrm && context.WyrmsSlain.Contains(wyrm),
            _ => false,
        };
    }
}

/// <summary>Account-level facts only: no Chronicle choice can open or close a region.</summary>
public sealed record RegionAccessContext(bool FirstHuntComplete, int HunterLevel, IReadOnlySet<DragonId> WyrmsSlain);

/// <summary>
/// A region's data contract (amendment §6, §11.5, §12): it declares its dominant discipline, ecology, roster, Wyrm influence,
/// resources and access, so a new region is added as data without touching global magic code.
/// </summary>
public sealed record RegionDefinition(
    RegionId Id,
    string Name,
    SpellSchool DominantSchool,
    RegionStatus Status,
    IReadOnlyList<WyrmrealmHabitat> Habitats,
    IReadOnlyList<EnemyKind> Roster,
    IReadOnlyList<string> ConceptRoster,
    IReadOnlyDictionary<DragonId, WyrmInfluence> Influence,
    RegionAccessRule Access)
{
    /// <summary>Region names are working titles until the product owner names them (amendment §14).</summary>
    public bool NameIsWorkingTitle => true;

    public DragonId HomeLineage => Influence.Single(entry => entry.Value == WyrmInfluence.Home).Key;

    public WyrmInfluence InfluenceOf(DragonId wyrm) => Influence.GetValueOrDefault(wyrm, WyrmInfluence.Absent);

    /// <summary>Lineages that cannot answer a hunt here.</summary>
    public IReadOnlySet<DragonId> AbsentLineages => Enum.GetValues<DragonId>().Where(wyrm => InfluenceOf(wyrm) == WyrmInfluence.Absent).ToHashSet();

    /// <summary>Essences a hunter can secure here: those of every lineage that hunts in the region, the home lineage first.</summary>
    public IReadOnlyList<DragonEssenceId> Resources => Influence
        .Where(entry => entry.Value != WyrmInfluence.Absent)
        .OrderByDescending(entry => entry.Value)
        .ThenBy(entry => entry.Key)
        .SelectMany(entry => DragonEssenceCatalog.ChoicesFor(entry.Key).Select(essence => essence.Id))
        .ToArray();

    public bool IsOpen(RegionAccessContext context) => Status == RegionStatus.Playable && Access.IsMet(context);
}
