using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Domain.Spells.Composition;

public enum SpellComponentKind { Form, Infusion, Reaction }

public enum SpellComponentId
{
    Bolt,
    Chain,
    RimeInfusion,
    StormCharge,
    ThermalShatter,
    ConduitDischarge,
}

// A typed, validated game rule. Components are data that select existing combat behavior; they are
// never user-authored scripts. A reaction realizes an existing synergy, which is the single source of
// its effect, so a composed reaction and the legacy synergy can never both apply.
public sealed record SpellComponentDefinition(
    SpellComponentId Id,
    SpellComponentKind Kind,
    string Name,
    int Complexity,
    IReadOnlyList<SpellTag> Requires,
    IReadOnlyList<SpellTag> Grants,
    SynergyId? Realizes = null);

public static class SpellComponentCatalog
{
    // Complexity costs are tuning hypotheses (handover §5 and §17): native form 0, secondary element 2, reaction 2.
    public static IReadOnlyList<SpellComponentDefinition> All { get; } =
    [
        new(SpellComponentId.Bolt, SpellComponentKind.Form, "Bolt", 0, [SpellTag.Projectile], [SpellTag.Impact]),
        new(SpellComponentId.Chain, SpellComponentKind.Form, "Chain", 0, [SpellTag.Chain], []),
        new(SpellComponentId.RimeInfusion, SpellComponentKind.Infusion, "Rime infusion", 2, [SpellTag.Impact], [SpellTag.Frost, SpellTag.AppliesFreeze]),
        new(SpellComponentId.StormCharge, SpellComponentKind.Infusion, "Storm charge", 2, [SpellTag.Impact], [SpellTag.Storm, SpellTag.Charged]),
        new(SpellComponentId.ThermalShatter, SpellComponentKind.Reaction, "Thermal shatter", 2, [SpellTag.Fire, SpellTag.AppliesFreeze], [], SynergyId.Frostfire),
        new(SpellComponentId.ConduitDischarge, SpellComponentKind.Reaction, "Conduit discharge", 2, [SpellTag.Arcane, SpellTag.Charged], [], SynergyId.ArcaneConduit),
    ];

    public static SpellComponentDefinition Get(SpellComponentId id) => All.Single(component => component.Id == id);
}
