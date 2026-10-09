namespace Wyrmforge.Application.Runs.Navigation;

public static class WyrmrealmStageCatalog
{
    public static WyrmrealmEncounterKind Kind(int stage) => stage switch
    {
        2 => WyrmrealmEncounterKind.Swarm,
        3 => WyrmrealmEncounterKind.StalkerPressure,
        _ => WyrmrealmEncounterKind.Mixed,
    };

    public static string Name(int stage) => stage switch { 2 => "Horde", 3 => "Ambush", 4 => "Heavy assault", _ => "Skirmish" };
    public static string Hint(int stage) => stage switch
    {
        2 => "Swarm from north and south",
        3 => "Hunters from left and right",
        4 => "Brutes lead the assault",
        _ => "Scattered enemies",
    };

    public static int SpawnEdge(int stage, int enemyIndex, int randomEdge) => stage switch
    {
        2 => enemyIndex % 2 == 0 ? 0 : 2,
        3 => enemyIndex % 2 == 0 ? 1 : 3,
        _ => randomEdge,
    };
}
