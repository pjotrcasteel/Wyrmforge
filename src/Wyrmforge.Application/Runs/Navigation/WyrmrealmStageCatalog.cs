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
        2 => "Massed enemies from opposite edges",
        3 => "Stalkers attack from alternating flanks",
        4 => "Brutes lead the final assault",
        _ => "Scattered enemies; room to build",
    };

    public static int SpawnEdge(int stage, int enemyIndex, int randomEdge) => stage switch
    {
        2 => enemyIndex % 2 == 0 ? 0 : 2,
        3 => enemyIndex % 2 == 0 ? 1 : 3,
        _ => randomEdge,
    };
}
