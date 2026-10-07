namespace Wyrmforge.Application.Runs.Navigation;

public static class WyrmrealmEncounterObjectiveCatalog
{
    public static int KillsRequired(WyrmrealmEncounterKind kind, int depth)
    {
        var depthOffset = Math.Max(0, depth - 1);
        return kind switch
        {
            WyrmrealmEncounterKind.Swarm => 20 + depthOffset * 4,
            WyrmrealmEncounterKind.StalkerPressure => 12 + depthOffset * 3,
            _ => 16 + depthOffset * 4,
        };
    }
}
