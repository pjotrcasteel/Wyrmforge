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

    public static string Cue(int stage, EncounterPhase? phase) => phase switch
    {
        EncounterPhase.BreathingRoom => "Spawns paused · collect XP",
        EncounterPhase.Pressure => WyrmrealmStageCatalog.Hint(stage),
        EncounterPhase.Escalation when stage == 3 => "Hunters on the flanks",
        EncounterPhase.Escalation when stage == 4 => "Brute reinforcements",
        EncounterPhase.Escalation => "Enemies arrive faster",
        EncounterPhase.Surge when stage == 2 => "Larger waves · north and south",
        EncounterPhase.Surge when stage == 3 => "More hunters on the flanks",
        EncounterPhase.Surge when stage == 4 => "Brutes press forward",
        EncounterPhase.Surge => "Hunters join the fight",
        EncounterPhase.Climax when stage == 2 => "Massed final wave",
        EncounterPhase.Climax when stage == 3 => "Flanking assault",
        EncounterPhase.Climax when stage == 4 => "Brutes and hunters · final assault",
        EncounterPhase.Climax => "Final wave · faster spawns",
        _ => "",
    };

    public static string EdgeClass(int stage) => stage switch { 2 => "north-south", 3 => "flanks", _ => "all-edges" };
}
