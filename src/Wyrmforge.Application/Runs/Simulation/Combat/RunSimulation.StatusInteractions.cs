using Wyrmforge.Domain.Combat.Interactions;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private IReadOnlyList<StatusInteractionRule> ResolveStatusInteractions(SpellId spell, ICombatTarget target)
    {
        var rules = SynergyCatalog.All.Where(synergy => build.Synergies.Contains(synergy.Id)).SelectMany(synergy => synergy.InteractionRules);
        return StatusInteractionResolver.Resolve(rules, spell, target.Statuses);
    }
}
