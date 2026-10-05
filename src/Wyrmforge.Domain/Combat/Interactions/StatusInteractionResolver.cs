using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Combat.Interactions;

public static class StatusInteractionResolver
{
    public static IReadOnlyList<StatusInteractionRule> Resolve(IEnumerable<StatusInteractionRule> rules, SpellId spell, CombatStatusCollection statuses)
    {
        var matches = new List<StatusInteractionRule>();
        foreach (var rule in rules)
        {
            if (rule.TriggerSpell == spell && statuses.Has(rule.RequiredStatus)) matches.Add(rule);
        }
        return matches;
    }
}
