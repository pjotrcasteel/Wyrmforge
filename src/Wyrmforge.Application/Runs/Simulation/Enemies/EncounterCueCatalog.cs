using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Runs.Simulation;

public static class EncounterCueCatalog
{
    public static string PhaseName(EncounterPhase? phase) => phase switch
    {
        EncounterPhase.Pressure => "Opening",
        EncounterPhase.Escalation => "Pressure rising",
        EncounterPhase.BreathingRoom => "Regroup",
        EncounterPhase.Surge => "Surge",
        EncounterPhase.Climax => "Final push",
        _ => "Trail",
    };

    public static string Cue(WyrmrealmMapNode node, EncounterPhase? phase) => WyrmrealmHabitatCatalog.Cue(node.Habitat,
        WyrmrealmStageCatalog.PressureStage(node.Stage), node.Stage == WyrmrealmMapState.CombatStages, phase);

    public static string EdgeClass(WyrmrealmMapNode node) => WyrmrealmHabitatCatalog.EdgeClass(node.Habitat);

    public static string Cue(int stage, EncounterPhase? phase) => CueForPressure(WyrmrealmStageCatalog.PressureStage(stage), phase);

    private static string CueForPressure(int stage, EncounterPhase? phase) => phase switch
    {
        EncounterPhase.BreathingRoom => "Spawns paused · collect XP",
        EncounterPhase.Pressure => WyrmrealmStageCatalog.Hint(stage switch { 3 => 5, 4 => 8, 2 => 3, _ => stage }),
        EncounterPhase.Escalation when stage == 3 => "Mire Hounds on the flanks",
        EncounterPhase.Escalation when stage == 4 => "Penitent reinforcements",
        EncounterPhase.Escalation => "Enemies arrive faster",
        EncounterPhase.Surge when stage == 2 => "Larger waves · north and south",
        EncounterPhase.Surge when stage == 3 => "More Mire Hounds on the flanks",
        EncounterPhase.Surge when stage == 4 => "Penitents press forward",
        EncounterPhase.Surge => "Mire Hounds join the fight",
        EncounterPhase.Climax when stage == 2 => "Massed final wave",
        EncounterPhase.Climax when stage == 3 => "Flanking assault",
        EncounterPhase.Climax when stage == 4 => "Penitents and Mire Hounds · final assault",
        EncounterPhase.Climax => "Final wave · faster spawns",
        _ => "",
    };

    public static string EdgeClass(int stage) => WyrmrealmStageCatalog.PressureStage(stage) switch { 2 => "north-south", 3 => "flanks", _ => "all-edges" };
}
