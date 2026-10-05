using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Combat.Modifiers;

public sealed record CombatRuleCondition(SpellId? Spell = null, SpellSchool? School = null, CombatStatusId? RequiredTargetStatus = null)
{
    public static CombatRuleCondition Any { get; } = new();

    public bool Matches(CombatRuleContext context)
    {
        if (Spell is { } spell && context.Spell != spell) return false;
        if (School is { } school && context.School != school) return false;
        if (RequiredTargetStatus is { } status && context.TargetStatuses?.Has(status) != true) return false;
        return true;
    }
}
