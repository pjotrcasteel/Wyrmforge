using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Domain.Spells.Composition;

public enum BlueprintIssueCode
{
    WrongComponentKind,
    FormMismatch,
    MissingRequirement,
    OverBudget,
    TooManyElements,
    SocketRejects,
}

// Every rejection carries a plain-language reason and a corrective action, shown before a hunt starts.
public sealed record BlueprintIssue(BlueprintIssueCode Code, string Reason, string Fix);

public sealed record BlueprintValidation(
    IReadOnlyList<BlueprintIssue> Issues,
    int Complexity,
    int Budget,
    IReadOnlySet<SpellTag> Tags,
    IReadOnlyList<SpellSchool> Elements,
    SynergyId? Realizes)
{
    public bool IsValid => Issues.Count == 0;
}

public static class BlueprintValidator
{
    private static readonly SpellTag[] ElementTags = [SpellTag.Fire, SpellTag.Frost, SpellTag.Storm, SpellTag.Arcane];

    // Deterministic: the same blueprint, ruleset and socket always produce the same issues in the same order.
    public static BlueprintValidation Validate(SpellBlueprint blueprint, BlueprintRuleset ruleset, IReadOnlyList<SpellTag>? socketAccepts = null)
    {
        ArgumentNullException.ThrowIfNull(blueprint);
        ArgumentNullException.ThrowIfNull(ruleset);
        var foundation = SpellCatalog.Get(blueprint.Foundation);
        var tags = new HashSet<SpellTag>(SpellTags.For(blueprint.Foundation));
        var issues = new List<BlueprintIssue>();
        var complexity = 0;
        SynergyId? realizes = null;

        foreach (var (slot, id) in blueprint.Components())
        {
            var component = SpellComponentCatalog.Get(id);
            if (component.Kind != slot)
            {
                issues.Add(new(BlueprintIssueCode.WrongComponentKind,
                    $"{component.Name} is a {Noun(component.Kind)}, not a {Noun(slot)}.",
                    $"Place {component.Name} in the {Noun(component.Kind)} slot."));
                continue;
            }
            complexity += component.Complexity;
            var missing = component.Requires.Where(tag => !tags.Contains(tag)).ToArray();
            if (missing.Length > 0)
            {
                var needs = string.Join(" and ", missing.Select(SpellTags.Describe));
                issues.Add(slot == SpellComponentKind.Form
                    ? new(BlueprintIssueCode.FormMismatch,
                        $"{foundation.Name} cannot take the {component.Name} form: it needs {needs}.",
                        $"Choose the form {foundation.Name} already uses.")
                    : new(BlueprintIssueCode.MissingRequirement,
                        $"{component.Name} needs {needs}, which this blueprint does not have.",
                        slot == SpellComponentKind.Reaction
                            ? $"Add an infusion that provides {needs}, or use a foundation that does."
                            : $"Use a foundation or form that provides {needs}."));
                continue;
            }
            tags.UnionWith(component.Grants);
            realizes ??= component.Realizes;
        }

        if (complexity > ruleset.ComplexityBudget)
        {
            issues.Add(new(BlueprintIssueCode.OverBudget,
                $"Complexity {complexity} exceeds the budget of {ruleset.ComplexityBudget}.",
                "Remove an infusion or reaction."));
        }

        var elements = ElementTags.Where(tags.Contains).Select(ToSchool).ToArray();
        if (elements.Length > ruleset.MaxElements)
        {
            issues.Add(new(BlueprintIssueCode.TooManyElements,
                $"{elements.Length} elements exceed the limit of {ruleset.MaxElements}.",
                "Remove an infusion that adds another element."));
        }

        if (socketAccepts is not null)
        {
            var unmet = socketAccepts.Where(tag => !tags.Contains(tag)).ToArray();
            if (unmet.Length > 0)
            {
                issues.Add(new(BlueprintIssueCode.SocketRejects,
                    $"This socket only accepts blueprints with {string.Join(" and ", unmet.Select(SpellTags.Describe))}.",
                    "Equip it in a socket on a matching Arcane Web bridge."));
            }
        }

        return new(issues, complexity, ruleset.ComplexityBudget, tags, elements, realizes);
    }

    private static string Noun(SpellComponentKind kind) => kind switch
    {
        SpellComponentKind.Form => "form",
        SpellComponentKind.Infusion => "infusion",
        _ => "reaction",
    };

    private static SpellSchool ToSchool(SpellTag tag) => tag switch
    {
        SpellTag.Fire => SpellSchool.Fire,
        SpellTag.Frost => SpellSchool.Frost,
        SpellTag.Storm => SpellSchool.Storm,
        _ => SpellSchool.Arcane,
    };
}
