namespace Wyrmforge.Domain.Combat.Interactions;

[Flags]
public enum EffectTags { None = 0, Fire = 1, Projectile = 2, Impact = 4, Burning = 8, Kill = 16, Explosion = 32, Field = 64 }
public enum EffectLifetime { Nexus, ArcaneWeb, Hunt }
public enum SynergyOutput { Explosion, BurningField }

/// <summary>Versioned, source-aware composition. Input events never mutate permanent progression.</summary>
public sealed record SynergyRule(string SourceId, EffectLifetime Lifetime, EffectTags RequiredTags,
    SynergyOutput Output, double DamageFraction, double Radius, string StackingGroup, EffectTags OutputTags = EffectTags.None);

public sealed record SynergyEvent(EffectTags Tags, double RootDamage, IReadOnlyList<string> Ancestry)
{
    public SynergyEvent Descend(string sourceId, EffectTags tags) => new(tags, RootDamage, [.. Ancestry, sourceId]);
}

public sealed record ResolvedSynergy(string SourceId, SynergyOutput Output, double Damage, double Radius, SynergyEvent Child);

public static class SynergyResolver
{
    public const int Version = 1;
    public const int MaximumDepth = 2;

    /// <summary>Stable source order, declining same-purpose contributions, immutable root damage and bounded work.</summary>
    public static IReadOnlyList<ResolvedSynergy> Resolve(IEnumerable<SynergyRule> rules, SynergyEvent input, ReactionBudget budget)
    {
        if (input.Ancestry.Count >= MaximumDepth || !double.IsFinite(input.RootDamage) || input.RootDamage <= 0) return [];
        var results = new List<ResolvedSynergy>();
        var stacking = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var rule in rules.OrderBy(rule => rule.SourceId, StringComparer.Ordinal).DistinctBy(rule => rule.SourceId))
        {
            if ((input.Tags & rule.RequiredTags) != rule.RequiredTags || input.Ancestry.Contains(rule.SourceId)) continue;
            if (!double.IsFinite(rule.DamageFraction) || rule.DamageFraction <= 0 || !double.IsFinite(rule.Radius) || rule.Radius <= 0) continue;
            if (!budget.TrySpend()) break;
            var rank = stacking.GetValueOrDefault(rule.StackingGroup);
            stacking[rule.StackingGroup] = rank + 1;
            var damage = input.RootDamage * rule.DamageFraction / (1 + rank);
            var tags = rule.OutputTags | (rule.Output == SynergyOutput.Explosion ? EffectTags.Explosion : EffectTags.Field);
            results.Add(new(rule.SourceId, rule.Output, damage, rule.Radius, input.Descend(rule.SourceId, tags)));
        }
        return results;
    }
}
