using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Combat.Modifiers;

public sealed record CombatRuleContext(CombatRuleTrigger Trigger, int Sequence, SpellId? Spell = null, SpellSchool? School = null,
    CombatStatusCollection? TargetStatuses = null);
