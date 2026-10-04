using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Navigation;

public sealed record WyrmrealmMapNode(
    string Id,
    string Name,
    int Stage,
    int Lane,
    WyrmrealmNodeType Type,
    WyrmrealmEncounterKind? EncounterKind,
    SpellSchool? AttunementSchool);
