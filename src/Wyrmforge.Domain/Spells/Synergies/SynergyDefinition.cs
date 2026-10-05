using Wyrmforge.Domain.Combat.Interactions;

namespace Wyrmforge.Domain.Spells.Synergies;

public sealed record SynergyDefinition(SynergyId Id, string Name, string Description, string Icon, IReadOnlyList<SpellId> RequiredSpells,
    IReadOnlyList<StatusInteractionRule>? StatusInteractions = null)
{
    public IReadOnlyList<StatusInteractionRule> InteractionRules => StatusInteractions ?? Array.Empty<StatusInteractionRule>();
}
