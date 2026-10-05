using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Application.Runs.Resonance;

public sealed record ResonanceThresholdDefinition(
    string Id,
    string Name,
    string Icon,
    string Description,
    IReadOnlyList<ResonanceRequirement> Requirements,
    BuildModifierProfile Modifiers);
