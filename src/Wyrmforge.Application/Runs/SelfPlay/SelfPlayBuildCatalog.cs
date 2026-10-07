using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.SelfPlay;

public enum SelfPlayBuildCohort
{
    KeystoneRoute,
    FullBuild,
}

public sealed record SelfPlayBuildDefinition(
    string Name,
    SelfPlayBuildCohort Cohort,
    SpellSchool PreferredSchool,
    IReadOnlySet<string> SelectedNodes,
    IReadOnlyList<string> Goals,
    int SpentPoints);

public static class SelfPlayBuildCatalog
{
    public static IReadOnlyList<SelfPlayBuildDefinition> All { get; } =
    [
        Create("Fire • Inferno", SelfPlayBuildCohort.KeystoneRoute, SpellSchool.Fire, "inferno"),
        Create("Fire • Volcanic Heart", SelfPlayBuildCohort.KeystoneRoute, SpellSchool.Fire, "volcanic"),
        Create("Frost • Absolute Zero", SelfPlayBuildCohort.KeystoneRoute, SpellSchool.Frost, "absolute-zero"),
        Create("Frost • Winter Shell", SelfPlayBuildCohort.KeystoneRoute, SpellSchool.Frost, "winter-shell"),
        Create("Storm • Living Storm", SelfPlayBuildCohort.KeystoneRoute, SpellSchool.Storm, "living-storm"),
        Create("Storm • Lightning Form", SelfPlayBuildCohort.KeystoneRoute, SpellSchool.Storm, "lightning-form"),
        Create("Arcane • Echo Chamber", SelfPlayBuildCohort.KeystoneRoute, SpellSchool.Arcane, "echo-chamber"),
        Create("Arcane • Astral Barrage", SelfPlayBuildCohort.KeystoneRoute, SpellSchool.Arcane, "astral-barrage"),

        Create("Fire / Frost Hybrid", SelfPlayBuildCohort.FullBuild, SpellSchool.Fire, "inferno", "absolute-zero"),
        Create("Fire / Storm Hybrid", SelfPlayBuildCohort.FullBuild, SpellSchool.Fire, "inferno", "living-storm"),
        Create("Storm / Arcane Hybrid", SelfPlayBuildCohort.FullBuild, SpellSchool.Storm, "living-storm", "echo-chamber"),
        Create("Frost / Arcane Hybrid", SelfPlayBuildCohort.FullBuild, SpellSchool.Frost, "absolute-zero", "echo-chamber"),
    ];

    public static SelfPlayBuildDefinition Get(string name) => All.Single(build => build.Name == name);

    private static SelfPlayBuildDefinition Create(string name, SelfPlayBuildCohort cohort, SpellSchool preferredSchool, params string[] goals)
    {
        var selection = new PassiveTreeSelection();

        foreach (var goal in goals)
        {
            var plan = PassiveTreePlanner.Plan(selection, goal) ?? throw new InvalidOperationException($"No Arcane route exists to {goal}.");
            if (!selection.SelectPath(plan.NodeIds)) throw new InvalidOperationException($"Arcane route to {goal} exceeds the build budget.");
        }

        return new SelfPlayBuildDefinition(name, cohort, preferredSchool, selection.Selected, goals, selection.SpentPoints);
    }
}
