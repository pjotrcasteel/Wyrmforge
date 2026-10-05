using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Combat.Interactions;

public sealed record StatusInteractionRule(SpellId TriggerSpell, CombatStatusId RequiredStatus, double DamageMultiplier = 1,
    double SplashRadius = 0, double SplashDamageMultiplier = 0, int BonusJumps = 0);
