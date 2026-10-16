namespace Wyrmforge.Application.Runs.Navigation;

/// <summary>
/// The local ecology of one hunt node. Separate from the depth-wide <see cref="WyrmrealmTerritory"/>
/// and from the elemental attunement school: it decides which monsters live there and where they come from.
/// </summary>
public enum WyrmrealmHabitat
{
    Outskirts,
    WetForest,
    OpenField,
    DesertedVillage,
    MonasteryGrounds,
    FloodedCloister,
    ScorchedApproach,
    Lair,
}

public enum WyrmrealmSpawnOrigin
{
    /// <summary>The road runs north–south: enemies walk in along it.</summary>
    Road,
    /// <summary>Woodland or water lines the sides: enemies emerge from the flanks.</summary>
    Flanks,
    /// <summary>Nothing hides the approach: enemies come from every side.</summary>
    AllSides,
}

public static class WyrmrealmHabitatCatalog
{
    public static string DisplayName(WyrmrealmHabitat habitat) => habitat switch
    {
        WyrmrealmHabitat.Outskirts => "Abandoned road",
        WyrmrealmHabitat.WetForest => "Wet forest",
        WyrmrealmHabitat.OpenField => "Open field",
        WyrmrealmHabitat.DesertedVillage => "Deserted village",
        WyrmrealmHabitat.MonasteryGrounds => "Monastery grounds",
        WyrmrealmHabitat.FloodedCloister => "Flooded cloister",
        WyrmrealmHabitat.ScorchedApproach => "Scorched approach",
        _ => "The lair",
    };

    /// <summary>A map-node label short enough for a 390px route map.</summary>
    public static string ShortName(WyrmrealmHabitat habitat) => habitat switch
    {
        WyrmrealmHabitat.Outskirts => "Old road",
        WyrmrealmHabitat.WetForest => "Forest",
        WyrmrealmHabitat.OpenField => "Field",
        WyrmrealmHabitat.DesertedVillage => "Village",
        WyrmrealmHabitat.MonasteryGrounds => "Monastery",
        WyrmrealmHabitat.FloodedCloister => "Cloister",
        WyrmrealmHabitat.ScorchedApproach => "Scorched",
        _ => "Lair",
    };

    public static string RoadName(WyrmrealmHabitat habitat) => habitat switch
    {
        WyrmrealmHabitat.WetForest => "Forest trail",
        WyrmrealmHabitat.OpenField => "Open field",
        WyrmrealmHabitat.DesertedVillage => "Dead hamlet",
        WyrmrealmHabitat.MonasteryGrounds => "Monastery grounds",
        WyrmrealmHabitat.FloodedCloister => "Flooded cloister",
        WyrmrealmHabitat.ScorchedApproach => "Scorched approach",
        _ => DisplayName(habitat),
    };

    public static WyrmrealmSpawnOrigin SpawnOrigin(WyrmrealmHabitat habitat) => habitat switch
    {
        WyrmrealmHabitat.WetForest or WyrmrealmHabitat.FloodedCloister => WyrmrealmSpawnOrigin.Flanks,
        WyrmrealmHabitat.OpenField or WyrmrealmHabitat.ScorchedApproach => WyrmrealmSpawnOrigin.AllSides,
        _ => WyrmrealmSpawnOrigin.Road,
    };

    public static string EdgeClass(WyrmrealmHabitat habitat) => SpawnOrigin(habitat) switch
    {
        WyrmrealmSpawnOrigin.Road => "north-south",
        WyrmrealmSpawnOrigin.Flanks => "flanks",
        _ => "all-edges",
    };

    /// <summary>A short, readable phase cue. Players learn the ecology from what arrives, not from paragraphs.</summary>
    public static string Cue(WyrmrealmHabitat habitat, int pressureStage, bool finalApproach, Simulation.EncounterPhase? phase)
    {
        if (phase == Simulation.EncounterPhase.BreathingRoom) return "Spawns paused · collect XP";
        if (finalApproach && phase == Simulation.EncounterPhase.Climax) return "Last stand before the lair";
        return (habitat, phase) switch
        {
            (WyrmrealmHabitat.Outskirts, Simulation.EncounterPhase.Pressure) => "Hollows shamble up the road",
            (WyrmrealmHabitat.Outskirts, Simulation.EncounterPhase.Escalation) => "More Hollows rise",
            (WyrmrealmHabitat.Outskirts, Simulation.EncounterPhase.Surge) => "The dead fill the road",
            (WyrmrealmHabitat.WetForest, Simulation.EncounterPhase.Pressure) => "Hounds stalk the treeline",
            (WyrmrealmHabitat.WetForest, Simulation.EncounterPhase.Escalation) => "Hounds circle the flanks",
            (WyrmrealmHabitat.WetForest, Simulation.EncounterPhase.Surge) => "The pack closes from the woods",
            (WyrmrealmHabitat.OpenField, Simulation.EncounterPhase.Pressure) => "Ashlings in the burnt grass",
            (WyrmrealmHabitat.OpenField, Simulation.EncounterPhase.Escalation) => "Ashlings rush the meadow",
            (WyrmrealmHabitat.OpenField, Simulation.EncounterPhase.Surge) => "Ashling mob from every side",
            (WyrmrealmHabitat.DesertedVillage, Simulation.EncounterPhase.Pressure) => "Hollows in the lanes",
            (WyrmrealmHabitat.DesertedVillage, Simulation.EncounterPhase.Escalation) => "The dead leave their houses",
            (WyrmrealmHabitat.DesertedVillage, Simulation.EncounterPhase.Surge) => "The whole hamlet rises",
            (WyrmrealmHabitat.MonasteryGrounds, Simulation.EncounterPhase.Pressure) => "Penitents hold the gates",
            (WyrmrealmHabitat.MonasteryGrounds, Simulation.EncounterPhase.Escalation) => "Shields advance through the court",
            (WyrmrealmHabitat.MonasteryGrounds, Simulation.EncounterPhase.Surge) => "The cloister guard marches",
            (WyrmrealmHabitat.FloodedCloister, Simulation.EncounterPhase.Pressure) => "Something stirs in the water",
            (WyrmrealmHabitat.FloodedCloister, Simulation.EncounterPhase.Escalation) => "Drowned dead wade in",
            (WyrmrealmHabitat.FloodedCloister, Simulation.EncounterPhase.Surge) => "The flood gives up its dead",
            (WyrmrealmHabitat.ScorchedApproach, Simulation.EncounterPhase.Pressure) => "Ash on the wind",
            (WyrmrealmHabitat.ScorchedApproach, Simulation.EncounterPhase.Escalation) => "A warband gathers",
            (WyrmrealmHabitat.ScorchedApproach, Simulation.EncounterPhase.Surge) => "Every kind of foe advances",
            (_, Simulation.EncounterPhase.Climax) => pressureStage >= 3 ? "Final assault" : "Final wave",
            _ => "",
        };
    }
}
