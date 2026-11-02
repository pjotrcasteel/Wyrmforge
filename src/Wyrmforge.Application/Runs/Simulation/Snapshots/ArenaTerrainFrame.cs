namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

/// <summary>
/// One subdivided 1 m column: 64 microcolumn heights (8 x 8, row-major) in 12.5 cm microcells, plus what the browser needs
/// to colour them. An empty <see cref="Heights"/> means the column is whole again and the client should drop its overlay.
/// <see cref="Wear"/> holds the 64 stone wear counters (0 to 3, as ints because byte arrays cross interop as base64) or null.
/// </summary>
public sealed record ArenaTerrainFineBlock(int Index, short[] Heights, int Topsoil, int StoneTop, int[]? Wear = null);

/// <summary>
/// The terrain heightfield for presentation, pulled only when <see cref="Revision"/> changes: coarse heights per metre and
/// material codes (row-major), plus the subdivided columns that changed since the client's known revision.
/// Presentation draws it; it never edits it.
/// </summary>
public sealed record ArenaTerrainFrame(int Revision, int Columns, int Rows, short[] Surface, int[] Material,
    IReadOnlyList<ArenaTerrainFineBlock> Fine);
