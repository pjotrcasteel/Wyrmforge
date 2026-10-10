using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Navigation;

public sealed record WyrmrealmMapNode(
    string Id,
    string Name,
    WyrmrealmNodePosition Position,
    WyrmrealmNodeType Type,
    WyrmrealmRouteProfile? Route,
    WyrmrealmNodeGraph Graph)
{
    public HuntSite? Site { get; init; }
    public WyrmrealmTerritory? Territory { get; init; }
    public int Stage => Position.Stage;
    public int Lane => Position.Lane;
    public IReadOnlyList<string> PreviousNodeIds => Graph.PreviousNodeIds;
    public WyrmrealmNodeRarity Rarity => Graph.Rarity;
    public WyrmrealmEncounterKind? EncounterKind => Route?.Encounter.Kind;
    public SpellSchool? AttunementSchool => Route?.Reward.AttunementSchool;
}
