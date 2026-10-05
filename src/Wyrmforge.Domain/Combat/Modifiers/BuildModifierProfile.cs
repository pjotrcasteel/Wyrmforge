namespace Wyrmforge.Domain.Combat.Modifiers;

public sealed record BuildModifierProfile(IReadOnlyList<BuildStatModifier> Stats, IReadOnlyList<CombatRuleDefinition> Rules)
{
    public static BuildModifierProfile Empty { get; } = new(Array.Empty<BuildStatModifier>(), Array.Empty<CombatRuleDefinition>());

    public BuildModifierProfile(IReadOnlyList<BuildStatModifier> stats) : this(stats, Array.Empty<CombatRuleDefinition>())
    {
    }
}
