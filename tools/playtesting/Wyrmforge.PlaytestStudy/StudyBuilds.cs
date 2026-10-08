using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.PlaytestStudy;

internal static class StudyBuilds
{
    public static IReadOnlyList<SelfPlayBuildDefinition> All { get; } =
    [
        .. SelfPlayBuildCatalog.All,
        new("Unspent", SelfPlayBuildCohort.KeystoneRoute, SpellSchool.Arcane, new HashSet<string>(), [], 0),
        Partial("Fire", SpellSchool.Fire),
        Partial("Frost", SpellSchool.Frost),
        Partial("Storm", SpellSchool.Storm),
        Partial("Arcane", SpellSchool.Arcane),
    ];

    private static SelfPlayBuildDefinition Partial(string name, SpellSchool school)
    {
        var selection = new PassiveTreeSelection();
        if (!selection.SelectPath([$"{name.ToLowerInvariant()}-start", $"{name.ToLowerInvariant()}-1", $"{name.ToLowerInvariant()}-2"]))
            throw new InvalidOperationException("Partial build must be a connected, legal three-point path.");
        return new SelfPlayBuildDefinition($"Partial {name}", SelfPlayBuildCohort.KeystoneRoute, school, selection.Selected, [], selection.SpentPoints);
    }
}
