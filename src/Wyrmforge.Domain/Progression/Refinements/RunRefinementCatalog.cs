using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.Refinements;

public sealed record RunRefinementDefinition(RunRefinementId Id, string Name, string Description, string Icon, BuildStatId Stat, BuildStatOperation Operation, double PerRank)
{
    public const int MaxRank = 6;

    public BuildModifierProfile ProfileForRank(int rank) => new([new BuildStatModifier(Stat, Operation, PerRank * rank)]);
}

public static class RunRefinementCatalog
{
    public static IReadOnlyList<RunRefinementDefinition> All { get; } =
    [
        new(RunRefinementId.Force, "Steady Force", "+6% spell damage per rank.", "✦", BuildStatId.Damage, BuildStatOperation.PercentAdd, 0.06),
        new(RunRefinementId.Rhythm, "Casting Rhythm", "4% shorter cast interval per rank.", "⋆", BuildStatId.CastInterval, BuildStatOperation.Multiply, -0.04),
        new(RunRefinementId.Footwork, "Fleet Step", "+4% movement speed per rank.", "➶", BuildStatId.MoveSpeed, BuildStatOperation.PercentAdd, 0.04),
        new(RunRefinementId.Warding, "Runic Ward", "Take 5% less damage per rank.", "⬟", BuildStatId.DamageTaken, BuildStatOperation.Multiply, -0.05),
        new(RunRefinementId.Vitality, "Life Thread", "+8 maximum health per rank, healing the increase.", "♥", BuildStatId.MaxHealth, BuildStatOperation.FlatAdd, 8),
    ];

    public static RunRefinementDefinition Get(RunRefinementId id) => All.Single(item => item.Id == id);
}
