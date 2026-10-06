using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.Resonance;

public sealed class RunResonanceState(IReadOnlySet<string> selectedNodes)
{
    public const int SpellRankWeight = 3;
    public const int SynergyWeight = 2;
    public const int RouteWeight = 4;

    private readonly IReadOnlySet<string> selectedNodeIds = new HashSet<string>(selectedNodes, StringComparer.Ordinal);

    public IReadOnlyList<RunResonanceEntry> Calculate(RunBuildState build, IReadOnlyList<WyrmrealmMapNode> completedNodes)
    {
        var values = Enum.GetValues<SpellSchool>().ToDictionary(school => school, _ => 0);

        foreach (var nodeId in selectedNodeIds)
        {
            var node = PassiveTreeCatalog.Get(nodeId);
            if (node.School is { } school) values[ToSpellSchool(school)] += node.Cost;
        }

        foreach (var spell in SpellCatalog.All)
        {
            values[spell.School] += build.Spells[spell.Id] * SpellRankWeight;
        }

        foreach (var synergyId in build.Synergies.Snapshot())
        {
            var schools = SynergyCatalog.Get(synergyId).RequiredSpells.Select(spellId => SpellCatalog.Get(spellId).School).Distinct();
            foreach (var school in schools) values[school] += SynergyWeight;
        }

        foreach (var node in completedNodes)
        {
            if (node.AttunementSchool is { } school) values[school] += RouteWeight;
        }

        return Enum.GetValues<SpellSchool>().Select(school => new RunResonanceEntry(school, values[school])).ToArray();
    }

    private static SpellSchool ToSpellSchool(PassiveSchool school) => school switch
    {
        PassiveSchool.Fire => SpellSchool.Fire,
        PassiveSchool.Frost => SpellSchool.Frost,
        PassiveSchool.Storm => SpellSchool.Storm,
        _ => SpellSchool.Arcane,
    };
}
