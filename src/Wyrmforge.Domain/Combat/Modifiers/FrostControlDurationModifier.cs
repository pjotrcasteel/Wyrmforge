using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Combat.Modifiers;

// Applies to the originating Frost spell's own control status, never to
// cross-school infusions, global ability durations or unrelated status effects.
public static class FrostControlDurationModifier
{
    public const double MaximumFactor = 1.5;

    public static double Apply(SpellSchool school, CombatStatusId status, double baseDuration, BuildModifierSet modifiers)
    {
        ArgumentNullException.ThrowIfNull(modifiers);
        if (school != SpellSchool.Frost || status is not (CombatStatusId.Frozen or CombatStatusId.Chilled) || baseDuration <= 0)
            return baseDuration;

        return Math.Clamp(modifiers.Apply(BuildStatId.FrostControlDuration, baseDuration), baseDuration,
            baseDuration * MaximumFactor);
    }
}
