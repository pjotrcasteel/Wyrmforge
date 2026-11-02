namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>
/// The terrain heightfield for presentation, pulled only when <see cref="Revision"/> changes: heights in 12.5 cm
/// microcells and material codes, row-major. Presentation draws it; it never edits it.
/// </summary>
public sealed record ArenaTerrainFrame(int Revision, int Columns, int Rows, short[] Surface, int[] Material);
