using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.PassiveTree;

internal static class PassiveNodeModifiers
{
    internal static BuildModifierProfile None => BuildModifierProfile.Empty;

    internal static BuildModifierProfile Stats(params BuildStatModifier[] modifiers) => new(modifiers);

    internal static BuildStatModifier Flat(BuildStatId stat, double value) => new(stat, BuildStatOperation.FlatAdd, value);

    internal static BuildStatModifier Percent(BuildStatId stat, double value) => new(stat, BuildStatOperation.PercentAdd, value);

    internal static BuildStatModifier Multiply(BuildStatId stat, double value) => new(stat, BuildStatOperation.Multiply, value);
}
