using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.SelfPlay;

public sealed record SelfPlayBuildDefinition(string Name, SpellSchool PreferredSchool, IReadOnlySet<string> SelectedNodes, IReadOnlyList<string> Goals);

public static class SelfPlayBuildCatalog
{
    public static IReadOnlyList<SelfPlayBuildDefinition> All { get; } =
    [
        Create("Fire • Inferno", SpellSchool.Fire, "inferno"),
        Create("Frost • Absolute Zero", SpellSchool.Frost, "absolute-zero"),
        Create("Storm • Living Storm", SpellSchool.Storm, "living-storm"),
        Create("Arcane • Echo Chamber", SpellSchool.Arcane, "echo-chamber"),
        Create("Fire / Storm Hybrid", SpellSchool.Fire, "inferno", "living-storm"),
        Create("Frost / Arcane Hybrid", SpellSchool.Frost, "absolute-zero", "echo-chamber"),
    ];

    private static SelfPlayBuildDefinition Create(string name, SpellSchool preferredSchool, params string[] goals)
    {
        var selection = new PassiveTreeSelection();

        foreach (var goal in goals)
        {
            var plan = PassiveTreePlanner.Plan(selection, goal) ?? throw new InvalidOperationException($"No Arcane route exists to {goal}.");
            if (!selection.SelectPath(plan.NodeIds)) throw new InvalidOperationException($"Arcane route to {goal} exceeds the build budget.");
        }

        return new SelfPlayBuildDefinition(name, preferredSchool, selection.Selected, goals);
    }
}
