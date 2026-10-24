namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>
/// Lab-only authoritative dry-leaf fuel transition. Source coordinates are
/// normalized like the Wet Forest ground recipe. No drawing is implied.
/// </summary>
public sealed record ArenaGroundScorchRenderSnapshot(
    int SourcePatchIndex, double X, double Y, double RadiusX, double RadiusY,
    double BurningSeconds, bool Charred);
