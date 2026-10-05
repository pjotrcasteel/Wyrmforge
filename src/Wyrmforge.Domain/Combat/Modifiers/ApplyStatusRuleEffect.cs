using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Domain.Combat.Modifiers;

public sealed record ApplyStatusRuleEffect(CombatStatusId Status, double DurationSeconds) : CombatRuleEffect;
