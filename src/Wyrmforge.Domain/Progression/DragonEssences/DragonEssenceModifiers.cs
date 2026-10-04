namespace Wyrmforge.Domain.Progression.DragonEssences;

public sealed record DragonEssenceModifiers(
    double DamageMultiplier = 1,
    double CastIntervalMultiplier = 1,
    double MoveSpeedMultiplier = 1,
    double MaxHealthBonus = 0,
    double DamageTakenMultiplier = 1)
{
    public static DragonEssenceModifiers None { get; } = new();

    public static DragonEssenceModifiers Aggregate(IEnumerable<DragonEssenceModifiers?> modifiers)
    {
        var result = None;
        foreach (var modifier in modifiers)
        {
            if (modifier is null) continue;
            result = new DragonEssenceModifiers(
                result.DamageMultiplier * modifier.DamageMultiplier,
                result.CastIntervalMultiplier * modifier.CastIntervalMultiplier,
                result.MoveSpeedMultiplier * modifier.MoveSpeedMultiplier,
                result.MaxHealthBonus + modifier.MaxHealthBonus,
                result.DamageTakenMultiplier * modifier.DamageTakenMultiplier);
        }
        return result;
    }
}
