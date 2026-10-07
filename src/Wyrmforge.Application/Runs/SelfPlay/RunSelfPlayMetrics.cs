using Wyrmforge.Application.Runs.EndRun;

namespace Wyrmforge.Application.Runs.SelfPlay;

public sealed record RunSelfPlayMetrics(
    string Build,
    string Agent,
    int Seed,
    RunOutcome Outcome,
    int Depth,
    int Score,
    int Kills,
    double SimulatedSeconds,
    int Level,
    int TotalExperience,
    double KillsPerMinute,
    double ExperiencePerMinute,
    double MinimumHealthRatio,
    double DamageTaken,
    int PeakEnemies,
    int PeakLooseExperience,
    int Choices,
    int Synergies,
    int DragonsSlain,
    int EssenceSecured,
    int CompletedRouteNodes,
    int RareRouteNodes,
    IReadOnlyDictionary<int, double> LevelUpSeconds,
    IReadOnlyList<string> Decisions);
