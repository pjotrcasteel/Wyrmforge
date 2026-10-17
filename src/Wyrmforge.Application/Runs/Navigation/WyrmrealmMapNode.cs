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
    public WyrmrealmHabitat Habitat { get; init; } = WyrmrealmHabitat.Outskirts;
    /// <summary>A combat road that leads straight into a Wyrm's lair (route-graph semantics, not a stage number): the Bell Warden's road.</summary>
    public bool PreLair { get; init; }
    public int EncounterCueStage => Stage == WyrmrealmMapState.CombatStages ? 8 : EncounterKind switch
    {
        WyrmrealmEncounterKind.Swarm => 3,
        WyrmrealmEncounterKind.StalkerPressure => 5,
        _ => 1,
    };
    public string EncounterName => PreLair ? "Bell Warden" : Stage == WyrmrealmMapState.CombatStages ? "Heavy assault" : EncounterKind switch
    {
        WyrmrealmEncounterKind.Swarm => "Horde",
        WyrmrealmEncounterKind.StalkerPressure => "Ambush",
        _ => "Skirmish",
    };
    public int Stage => Position.Stage;
    public int Lane => Position.Lane;
    public IReadOnlyList<string> PreviousNodeIds => Graph.PreviousNodeIds;
    public WyrmrealmNodeRarity Rarity => Graph.Rarity;
    public WyrmrealmEncounterKind? EncounterKind => Route?.Encounter.Kind;
    public SpellSchool? AttunementSchool => Route?.Reward.AttunementSchool;
}
