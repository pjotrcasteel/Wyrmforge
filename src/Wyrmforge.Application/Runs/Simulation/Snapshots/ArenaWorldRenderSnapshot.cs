namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

// All combat positions are canonical world coordinates; only rendering knows about the viewport/camera.
public sealed record ArenaWorldRenderSnapshot(double Width, double Height);
