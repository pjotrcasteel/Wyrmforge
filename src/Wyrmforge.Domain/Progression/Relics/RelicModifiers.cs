namespace Wyrmforge.Domain.Progression.Relics;

public sealed record RelicModifiers(double DamageMultiplier = 1, double CastIntervalMultiplier = 1, double MoveSpeedMultiplier = 1, double MaxHealthBonus = 0)
{
    public static RelicModifiers None { get; } = new();

    public static RelicModifiers Aggregate(IEnumerable<RelicId> relics)
    {
        var damageMultiplier = 1d;
        var castIntervalMultiplier = 1d;
        var moveSpeedMultiplier = 1d;
        var maxHealthBonus = 0d;
        foreach (var relic in relics)
        {
            var modifiers = RelicCatalog.Get(relic).Modifiers;
            damageMultiplier *= modifiers.DamageMultiplier;
            castIntervalMultiplier *= modifiers.CastIntervalMultiplier;
            moveSpeedMultiplier *= modifiers.MoveSpeedMultiplier;
            maxHealthBonus += modifiers.MaxHealthBonus;
        }
        return new RelicModifiers(damageMultiplier, castIntervalMultiplier, moveSpeedMultiplier, maxHealthBonus);
    }
}
