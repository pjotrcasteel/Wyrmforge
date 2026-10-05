namespace Wyrmforge.Domain.Combat.Modifiers;

public static class CombatRuleResolver
{
    public static IReadOnlyList<CombatRuleDefinition> Resolve(IEnumerable<CombatRuleDefinition> rules, CombatRuleContext context)
    {
        var matches = new List<CombatRuleDefinition>();
        foreach (var rule in rules)
        {
            if (rule.Trigger != context.Trigger || rule.Every <= 0 || context.Sequence <= 0 || context.Sequence % rule.Every != 0) continue;
            if (rule.EffectiveCondition.Matches(context)) matches.Add(rule);
        }
        return matches;
    }
}
