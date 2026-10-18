using Wyrmforge.Domain.Spells;

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
    // Rimeclaw's region (Frost roster F4). Appended so saved Fire habitats keep their values. Each fills the slot of the Fire
    // habitat it mirrors in the hunt map, so a Frost map keeps the same shape while its ecology is its own.
    FrozenRoad,
    SnowboundPines,
    WhiteoutPlain,
    BuriedHamlet,
    CairnBarrows,
    MirrorMere,
    GlacierApproach,
    GlacierLair,
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
        WyrmrealmHabitat.FrozenRoad => "Frozen road",
        WyrmrealmHabitat.SnowboundPines => "Snowbound pines",
        WyrmrealmHabitat.WhiteoutPlain => "Whiteout plain",
        WyrmrealmHabitat.BuriedHamlet => "Buried hamlet",
        WyrmrealmHabitat.CairnBarrows => "Cairn barrows",
        WyrmrealmHabitat.MirrorMere => "Mirror mere",
        WyrmrealmHabitat.GlacierApproach => "Glacier approach",
        WyrmrealmHabitat.GlacierLair => "The glacier lair",
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
        WyrmrealmHabitat.FrozenRoad => "Ice road",
        WyrmrealmHabitat.SnowboundPines => "Pines",
        WyrmrealmHabitat.WhiteoutPlain => "Whiteout",
        WyrmrealmHabitat.BuriedHamlet => "Hamlet",
        WyrmrealmHabitat.CairnBarrows => "Barrows",
        WyrmrealmHabitat.MirrorMere => "Mere",
        WyrmrealmHabitat.GlacierApproach => "Glacier",
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
        WyrmrealmHabitat.SnowboundPines => "Pine trail",
        WyrmrealmHabitat.BuriedHamlet => "Buried hamlet",
        _ => DisplayName(habitat),
    };

    public static WyrmrealmSpawnOrigin SpawnOrigin(WyrmrealmHabitat habitat) => habitat switch
    {
        WyrmrealmHabitat.WetForest or WyrmrealmHabitat.FloodedCloister
            or WyrmrealmHabitat.SnowboundPines or WyrmrealmHabitat.MirrorMere => WyrmrealmSpawnOrigin.Flanks,
        WyrmrealmHabitat.OpenField or WyrmrealmHabitat.ScorchedApproach
            or WyrmrealmHabitat.WhiteoutPlain or WyrmrealmHabitat.GlacierApproach => WyrmrealmSpawnOrigin.AllSides,
        _ => WyrmrealmSpawnOrigin.Road,
    };

    public static IReadOnlyList<WyrmrealmHabitat> Fire { get; } =
    [
        WyrmrealmHabitat.Outskirts, WyrmrealmHabitat.WetForest, WyrmrealmHabitat.OpenField, WyrmrealmHabitat.DesertedVillage,
        WyrmrealmHabitat.MonasteryGrounds, WyrmrealmHabitat.FloodedCloister, WyrmrealmHabitat.ScorchedApproach, WyrmrealmHabitat.Lair,
    ];

    public static IReadOnlyList<WyrmrealmHabitat> Frost { get; } =
    [
        WyrmrealmHabitat.FrozenRoad, WyrmrealmHabitat.SnowboundPines, WyrmrealmHabitat.WhiteoutPlain, WyrmrealmHabitat.BuriedHamlet,
        WyrmrealmHabitat.CairnBarrows, WyrmrealmHabitat.MirrorMere, WyrmrealmHabitat.GlacierApproach, WyrmrealmHabitat.GlacierLair,
    ];

    /// <summary>The discipline whose land this habitat belongs to.</summary>
    public static SpellSchool School(WyrmrealmHabitat habitat) => Frost.Contains(habitat) ? SpellSchool.Frost : SpellSchool.Fire;

    /// <summary>
    /// The map generator lays out every hunt with the first region's slots; a region swaps each slot for its own habitat
    /// (old road → frozen road, cloister → mirror mere). Regions without authored habitats keep the first region's.
    /// </summary>
    public static WyrmrealmHabitat ForSchool(WyrmrealmHabitat slot, SpellSchool school)
    {
        var index = IndexIn(Fire, slot);
        if (index < 0) index = IndexIn(Frost, slot);
        if (index < 0) return slot;
        return school == SpellSchool.Frost ? Frost[index] : Fire[index];
    }

    private static int IndexIn(IReadOnlyList<WyrmrealmHabitat> habitats, WyrmrealmHabitat habitat)
    {
        for (var index = 0; index < habitats.Count; index++)
            if (habitats[index] == habitat) return index;
        return -1;
    }

    /// <summary>The tutorial road of a region: a single resident, no elites, no surge event.</summary>
    public static bool IsOpening(WyrmrealmHabitat habitat) => habitat is WyrmrealmHabitat.Outskirts or WyrmrealmHabitat.FrozenRoad;

    /// <summary>The burnt or frozen country before the lair, where the climax becomes a Last Stand.</summary>
    public static bool IsFinalApproach(WyrmrealmHabitat habitat) => habitat is WyrmrealmHabitat.ScorchedApproach or WyrmrealmHabitat.Lair
        or WyrmrealmHabitat.GlacierApproach or WyrmrealmHabitat.GlacierLair;

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
            (WyrmrealmHabitat.FrozenRoad, Simulation.EncounterPhase.Pressure) => "Packlings sniff along the road",
            (WyrmrealmHabitat.FrozenRoad, Simulation.EncounterPhase.Escalation) => "The litter grows bolder",
            (WyrmrealmHabitat.FrozenRoad, Simulation.EncounterPhase.Surge) => "The whole litter runs the road",
            (WyrmrealmHabitat.SnowboundPines, Simulation.EncounterPhase.Pressure) => "Something pale moves in the pines",
            (WyrmrealmHabitat.SnowboundPines, Simulation.EncounterPhase.Escalation) => "Whitefangs circle the snowline",
            (WyrmrealmHabitat.SnowboundPines, Simulation.EncounterPhase.Surge) => "The hunt closes from the trees",
            (WyrmrealmHabitat.WhiteoutPlain, Simulation.EncounterPhase.Pressure) => "Shapes in the whiteout",
            (WyrmrealmHabitat.WhiteoutPlain, Simulation.EncounterPhase.Escalation) => "Shards hiss through the snow",
            (WyrmrealmHabitat.WhiteoutPlain, Simulation.EncounterPhase.Surge) => "The plain closes from every side",
            (WyrmrealmHabitat.BuriedHamlet, Simulation.EncounterPhase.Pressure) => "Chanting under the snow",
            (WyrmrealmHabitat.BuriedHamlet, Simulation.EncounterPhase.Escalation) => "The hamlet's choir gathers",
            (WyrmrealmHabitat.BuriedHamlet, Simulation.EncounterPhase.Surge) => "The rite fills the lanes",
            (WyrmrealmHabitat.CairnBarrows, Simulation.EncounterPhase.Pressure) => "Cairns stand guard",
            (WyrmrealmHabitat.CairnBarrows, Simulation.EncounterPhase.Escalation) => "The barrow wardens wake",
            (WyrmrealmHabitat.CairnBarrows, Simulation.EncounterPhase.Surge) => "A wall of cairns advances",
            (WyrmrealmHabitat.MirrorMere, Simulation.EncounterPhase.Pressure) => "Your reflection moves wrong",
            (WyrmrealmHabitat.MirrorMere, Simulation.EncounterPhase.Escalation) => "Wisps glide across the ice",
            (WyrmrealmHabitat.MirrorMere, Simulation.EncounterPhase.Surge) => "The mere fills with false shapes",
            (WyrmrealmHabitat.GlacierApproach, Simulation.EncounterPhase.Pressure) => "Snow on the wind",
            (WyrmrealmHabitat.GlacierApproach, Simulation.EncounterPhase.Escalation) => "A frost warband gathers",
            (WyrmrealmHabitat.GlacierApproach, Simulation.EncounterPhase.Surge) => "Everything in the cold advances",
            (_, Simulation.EncounterPhase.Climax) => pressureStage >= 3 ? "Final assault" : "Final wave",
            _ => "",
        };
    }
}
