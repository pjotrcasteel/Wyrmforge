namespace Wyrmforge.Application.Runs.SelfPlay;

public sealed record RunSelfPlayOptions(
    double TickSeconds = 0.05,
    double ArenaWidth = 1280,
    double ArenaHeight = 720,
    double MaximumSimulatedSeconds = 720);
