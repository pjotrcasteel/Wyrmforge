namespace Wyrmforge.Domain.Spells.Composition;

// Foundation + exactly one form + at most one infusion + at most one conditioned reaction.
public sealed record SpellBlueprint(SpellId Foundation, SpellComponentId Form, SpellComponentId? Infusion = null, SpellComponentId? Reaction = null)
{
    public IEnumerable<(SpellComponentKind Slot, SpellComponentId Id)> Components()
    {
        yield return (SpellComponentKind.Form, Form);
        if (Infusion is { } infusion) yield return (SpellComponentKind.Infusion, infusion);
        if (Reaction is { } reaction) yield return (SpellComponentKind.Reaction, reaction);
    }
}

// A frozen, versioned set of composition limits. Ranked rulesets (Phase F) pin a version; changing a
// limit means a new version, never an edit to an old one. Values are tuning hypotheses (handover §17).
public sealed record BlueprintRuleset(int Version, int ComplexityBudget, int MaxElements, int MaxReactionEventsPerStep)
{
    public static BlueprintRuleset V1 { get; } = new(Version: 1, ComplexityBudget: 6, MaxElements: 3, MaxReactionEventsPerStep: 16);

    public static BlueprintRuleset Current => V1;
}
