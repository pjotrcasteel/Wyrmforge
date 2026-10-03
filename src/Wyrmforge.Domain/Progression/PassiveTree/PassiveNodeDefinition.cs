namespace Wyrmforge.Domain.Progression.PassiveTree;

public sealed record PassiveNodeDefinition(
    string Id,
    string Name,
    string Description,
    NodeTier Tier,
    PassiveSchool School,
    int Cost,
    IReadOnlyList<string> Requires,
    IReadOnlyList<string> Excludes);
