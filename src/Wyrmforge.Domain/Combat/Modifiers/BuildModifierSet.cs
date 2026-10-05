namespace Wyrmforge.Domain.Combat.Modifiers;

public sealed class BuildModifierSet
{
    private readonly IReadOnlyList<BuildStatModifier> stats;

    private BuildModifierSet(IReadOnlyList<BuildStatModifier> stats, IReadOnlyList<CombatRuleDefinition> rules)
    {
        this.stats = stats;
        Rules = rules;
    }

    public static BuildModifierSet Empty { get; } = new(Array.Empty<BuildStatModifier>(), Array.Empty<CombatRuleDefinition>());

    public IReadOnlyList<CombatRuleDefinition> Rules { get; }

    public double Apply(BuildStatId stat, double baseValue)
    {
        var flatAdd = 0d;
        var percentAdd = 0d;
        var multiplier = 1d;
        foreach (var modifier in stats)
        {
            if (modifier.Stat != stat) continue;
            switch (modifier.Operation)
            {
                case BuildStatOperation.FlatAdd:
                    flatAdd += modifier.Value;
                    break;
                case BuildStatOperation.PercentAdd:
                    percentAdd += modifier.Value;
                    break;
                case BuildStatOperation.Multiply:
                    multiplier *= modifier.Value;
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported build stat operation {modifier.Operation}.");
            }
        }
        return (baseValue + flatAdd) * (1 + percentAdd) * multiplier;
    }

    public int ApplyInt(BuildStatId stat, int baseValue = 0) => (int)Math.Round(Apply(stat, baseValue), MidpointRounding.AwayFromZero);

    public static BuildModifierSet Aggregate(IEnumerable<BuildModifierProfile?> profiles)
    {
        var stats = new List<BuildStatModifier>();
        var rules = new List<CombatRuleDefinition>();
        foreach (var profile in profiles)
        {
            if (profile is null) continue;
            stats.AddRange(profile.Stats);
            rules.AddRange(profile.Rules);
        }
        return new BuildModifierSet(stats, rules);
    }
}
