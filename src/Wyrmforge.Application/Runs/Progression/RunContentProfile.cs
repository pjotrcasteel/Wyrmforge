using Wyrmforge.Domain.Progression.Forge;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Progression;

public sealed record RunContentProfile(IReadOnlySet<SpellId> Spells, IReadOnlySet<RelicId> Relics)
{
    private static readonly HashSet<SpellId> BaseSpells =
    [
        SpellId.ArcaneOrb,
        SpellId.FireBolt,
        SpellId.FrostShard,
        SpellId.ChainLightning,
    ];

    private static readonly HashSet<RelicId> BaseRelics =
    [
        RelicId.ChronoglassShard,
        RelicId.GalefootSigil,
        RelicId.Vitalstone,
        RelicId.DuelistLens,
    ];

    public static RunContentProfile From(ForgeProgressionState progression)
    {
        ArgumentNullException.ThrowIfNull(progression);
        var spells = SpellCatalog.All.Where(spell => BaseSpells.Contains(spell.Id) || progression.UnlocksSpell(spell.Id)).Select(spell => spell.Id).ToHashSet();
        var relics = RelicCatalog.All.Where(relic => BaseRelics.Contains(relic.Id) || progression.UnlocksRelic(relic.Id)).Select(relic => relic.Id).ToHashSet();
        return new RunContentProfile(spells, relics);
    }

    public static RunContentProfile All { get; } = new(SpellCatalog.All.Select(spell => spell.Id).ToHashSet(), RelicCatalog.All.Select(relic => relic.Id).ToHashSet());
}
