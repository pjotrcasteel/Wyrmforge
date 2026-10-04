using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Navigation;

public sealed record WyrmrealmMapNode(
    string Id,
    string Name,
    int Stage,
    int Lane,
    WyrmrealmNodeType Type,
    WyrmrealmRouteProfile? Route)
{
    public WyrmrealmEncounterKind? EncounterKind => Route?.Encounter.Kind;

    public SpellSchool? AttunementSchool => Route?.Reward.AttunementSchool;
}
