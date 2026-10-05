namespace Wyrmforge.Domain.Combat.Modifiers;

public sealed record CombatRuleDefinition(CombatRuleTrigger Trigger, int Every, CombatRuleEffect Effect, CombatRuleCondition? Condition = null)
{
    public CombatRuleCondition EffectiveCondition => Condition ?? CombatRuleCondition.Any;
}
