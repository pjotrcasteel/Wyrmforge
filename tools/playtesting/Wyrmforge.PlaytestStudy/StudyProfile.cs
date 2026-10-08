using Wyrmforge.Application.Runs.SelfPlay;

namespace Wyrmforge.PlaytestStudy;

internal sealed record StudyProfile(string Name, double ReactionSeconds, double HazardMissChance, double PickupMissChance, double ChoiceMistakeChance,
    double DirectionErrorDegrees = 0, double IdleChance = 0, bool AvoidEdges = false)
{
    public static IReadOnlyList<StudyProfile> All { get; } =
    [
        new("Control", 0.05, 0, 0, 0),
        new("Deliberate", 0.20, 0.05, 0.10, 0.10, 4),
        new("Novice", 0.40, 0.25, 0.35, 0.30, 12),
        new("Distracted", 0.65, 0.50, 0.60, 0.45, 20, 0.10),
        new("EdgeAwareControl", 0.05, 0, 0, 0, AvoidEdges: true),
        new("EdgeAwareNovice", 0.40, 0.25, 0.35, 0.30, 12, AvoidEdges: true),
    ];
}

internal sealed record StudyArena(string Name, double Width, double Height)
{
    public static IReadOnlyList<StudyArena> All { get; } =
    [
        new("Desktop", 1280, 720),
        new("Portrait", 390, 844),
        new("Landscape", 844, 390),
    ];
}

internal sealed record StudyRun(string Content, StudyArena Arena, string Profile, double OutwardWallInputRate, RunSelfPlayMetrics Metrics);
