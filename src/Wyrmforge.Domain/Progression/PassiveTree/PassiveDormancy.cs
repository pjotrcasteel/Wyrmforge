using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.PassiveTree;

/// <summary>Alternative dormant effects; never a second copy of an active trigger.</summary>
public static class PassiveDormancy
{
    // Initial tuning, not a permanent economy promise. Higher investment tiers retain
    // a slightly stronger school identity without carrying active proc mechanics.
    public const double InfluencePerPoint = 0.005;

    public static bool IsActive(PassiveNodeDefinition node, PassiveSchool? activeSchool) =>
        activeSchool is null || ArcaneSchoolCatalog.Owner(node) is null || ArcaneSchoolCatalog.Owner(node) == activeSchool;

    public static BuildModifierProfile Resolve(PassiveNodeDefinition node, PassiveSchool? activeSchool)
    {
        if (IsActive(node, activeSchool)) return node.Modifiers;
        return DormantProfile(node);
    }

    public static BuildModifierProfile DormantProfile(PassiveNodeDefinition node)
    {
        var strength = node.Cost * InfluencePerPoint;
        var modifier = ArcaneSchoolCatalog.Owner(node) switch
        {
            PassiveSchool.Fire => new BuildStatModifier(BuildStatId.BurnDamage, BuildStatOperation.PercentAdd, strength),
            PassiveSchool.Frost => new BuildStatModifier(BuildStatId.DamageTaken, BuildStatOperation.PercentAdd, -strength),
            PassiveSchool.Storm => new BuildStatModifier(BuildStatId.ProjectileSpeed, BuildStatOperation.PercentAdd, strength),
            PassiveSchool.Arcane => new BuildStatModifier(BuildStatId.CastInterval, BuildStatOperation.PercentAdd, -strength),
            PassiveSchool.Death => new BuildStatModifier(BuildStatId.MaxHealth, BuildStatOperation.PercentAdd, strength),
            PassiveSchool.Binding => new BuildStatModifier(BuildStatId.Damage, BuildStatOperation.PercentAdd, strength),
            _ => null,
        };
        return modifier is null ? BuildModifierProfile.Empty : new BuildModifierProfile([modifier]);
    }

    public static string Description(PassiveNodeDefinition node)
    {
        var amount = (node.Cost * InfluencePerPoint * 100).ToString("0.#", System.Globalization.CultureInfo.InvariantCulture);
        return ArcaneSchoolCatalog.Owner(node) switch
        {
            PassiveSchool.Fire => $"Dormant: +{amount}% burning damage.",
            PassiveSchool.Frost => $"Dormant: {amount}% reduced damage taken.",
            PassiveSchool.Storm => $"Dormant: +{amount}% projectile speed.",
            PassiveSchool.Arcane => $"Dormant: {amount}% reduced cast interval.",
            PassiveSchool.Death => $"Dormant: +{amount}% maximum health.",
            PassiveSchool.Binding => $"Dormant: +{amount}% spell damage.",
            _ => string.Empty,
        };
    }
}
