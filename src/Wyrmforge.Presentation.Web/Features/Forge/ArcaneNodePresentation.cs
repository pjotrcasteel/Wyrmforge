using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Presentation.Web.Features.Forge;

internal sealed record ArcaneStatBadge(string Icon, string Value, string Label);

internal static class ArcaneNodePresentation
{
    internal static IReadOnlyList<ArcaneStatBadge> MinorBonuses(PassiveNodeDefinition node) => node.Kind == PassiveNodeKind.Travel
        ? AggregateMinorBonuses([node])
        : Array.Empty<ArcaneStatBadge>();

    internal static IReadOnlyList<ArcaneStatBadge> AggregateMinorBonuses(IEnumerable<PassiveNodeDefinition> nodes)
    {
        var modifiers = nodes.Where(node => node.Kind == PassiveNodeKind.Travel).SelectMany(node => node.Modifiers.Stats).ToArray();
        var badges = new List<ArcaneStatBadge>();

        foreach (var stat in modifiers.Select(modifier => modifier.Stat).Distinct())
        {
            var relevant = modifiers.Where(modifier => modifier.Stat == stat).ToArray();
            var flat = relevant.Where(modifier => modifier.Operation == BuildStatOperation.FlatAdd).Sum(modifier => modifier.Value);
            var percent = relevant.Where(modifier => modifier.Operation == BuildStatOperation.PercentAdd).Sum(modifier => modifier.Value);
            var multiplier = relevant.Where(modifier => modifier.Operation == BuildStatOperation.Multiply).Aggregate(1d, (current, modifier) => current * modifier.Value);

            if (Math.Abs(flat) > double.Epsilon) badges.Add(FlatBadge(stat, flat));
            if (Math.Abs(percent) > double.Epsilon) badges.Add(PercentBadge(stat, percent));
            if (Math.Abs(multiplier - 1) > double.Epsilon) badges.Add(MultiplierBadge(stat, multiplier));
        }

        return badges;
    }

    internal static string SchoolIcon(PassiveNodeDefinition node) => node.School switch
    {
        PassiveSchool.Fire => "🔥",
        PassiveSchool.Frost => "❄",
        PassiveSchool.Storm => "⚡",
        PassiveSchool.Arcane => "✦",
        _ => "◇",
    };

    private static ArcaneStatBadge FlatBadge(BuildStatId stat, double value) => new(Icon(stat), SignedNumber(value), Label(stat));

    private static ArcaneStatBadge PercentBadge(BuildStatId stat, double value) =>
        new(Icon(stat), SignedPercent(value * 100), Label(stat));

    private static ArcaneStatBadge MultiplierBadge(BuildStatId stat, double value)
    {
        if (stat == BuildStatId.CastInterval)
        {
            var castSpeed = (1 / value - 1) * 100;
            return new ArcaneStatBadge(Icon(stat), SignedPercent(castSpeed), "cast speed");
        }

        if (stat == BuildStatId.DamageTaken)
        {
            var reduction = (1 - value) * 100;
            return new ArcaneStatBadge(Icon(stat), SignedPercent(-reduction), "damage taken");
        }

        return new ArcaneStatBadge(Icon(stat), SignedPercent((value - 1) * 100), Label(stat));
    }

    private static string Icon(BuildStatId stat) => stat switch
    {
        BuildStatId.Damage => "✹",
        BuildStatId.CastInterval => "⟳",
        BuildStatId.ProjectileSpeed => "➶",
        BuildStatId.MoveSpeed => "↟",
        BuildStatId.MaxHealth => "♥",
        BuildStatId.DamageTaken => "◈",
        BuildStatId.ExtraProjectiles => "✦",
        BuildStatId.BonusChains => "⌁",
        _ => "•",
    };

    private static string Label(BuildStatId stat) => stat switch
    {
        BuildStatId.Damage => "spell damage",
        BuildStatId.CastInterval => "cast speed",
        BuildStatId.ProjectileSpeed => "projectile speed",
        BuildStatId.MoveSpeed => "move speed",
        BuildStatId.MaxHealth => "vitality",
        BuildStatId.DamageTaken => "damage taken",
        BuildStatId.ExtraProjectiles => "projectiles",
        BuildStatId.BonusChains => "chains",
        _ => stat.ToString(),
    };

    private static string SignedNumber(double value) => $"{(value >= 0 ? "+" : string.Empty)}{value:0.#}";
    private static string SignedPercent(double value) => $"{(value >= 0 ? "+" : string.Empty)}{value:0.#}%";
}
