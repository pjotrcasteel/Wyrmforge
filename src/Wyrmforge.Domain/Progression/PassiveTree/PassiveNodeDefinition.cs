using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.PassiveTree;

public sealed record PassiveNodeDefinition(
    string Id,
    string Name,
    string Description,
    PassiveNodeKind Kind,
    PassiveSchool? School,
    int Cost,
    double X,
    double Y,
    BuildModifierProfile Modifiers,
    string? MasteryGroup = null);
