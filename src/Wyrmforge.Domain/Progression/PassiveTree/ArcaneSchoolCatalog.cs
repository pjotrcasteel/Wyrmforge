using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Progression.PassiveTree;

public sealed record ArcaneSchoolDefinition(PassiveSchool Id, DivineArchetype Archetype, string Name, string Icon, bool Authored);

public static class ArcaneSchoolCatalog
{
    public static IReadOnlyList<ArcaneSchoolDefinition> All { get; } =
    [
        new(PassiveSchool.Fire, DivineArchetype.Pyromancer, "Pyromancer", "fire", true),
        new(PassiveSchool.Frost, DivineArchetype.Cryomancer, "Cryomancer", "frost", true),
        new(PassiveSchool.Storm, DivineArchetype.Stormcaller, "Stormcaller", "storm", true),
        new(PassiveSchool.Arcane, DivineArchetype.Arcanist, "Arcanist", "arcane", true),
        new(PassiveSchool.Death, DivineArchetype.Necromancer, "Necromancer", "death", false),
        new(PassiveSchool.Binding, DivineArchetype.Summoner, "Summoner", "binding", false),
    ];

    public static ArcaneSchoolDefinition Get(PassiveSchool school) => All.Single(item => item.Id == school);
    public static PassiveSchool For(DivineArchetype archetype) => All.Single(item => item.Archetype == archetype).Id;
    public static PassiveSchool? Owner(PassiveNodeDefinition node) => node.LearningSchool ?? node.School;
}
