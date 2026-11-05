using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>
/// Lava glow from the authoritative terrain grid for the shared lighting engine. Lava is immutable, so the
/// cluster IDs are stable; only the few nearest the hunter are emitted to stay inside the mobile light budget.
/// </summary>
public static class TerrainLightingProjection
{
    public const int ClusterColumns = 6;
    public const int MaxEmitters = 4;
    public const int MaxTorchEmitters = 3;
    private const string LavaColor = "#ff5a14";
    private const string TorchColor = "#ffad5c";
    private const double TorchHeight = 44, TorchIntensity = 9, TorchRange = 300;

    public static IReadOnlyList<LightingEmitter> Capture(ArenaTerrainGrid? grid, Vector2D focus)
    {
        if (grid is null) return [];
        var clusters = new Dictionary<(int Block, int BlockRow), (double X, double Y, int Count)>();
        for (var row = 0; row < grid.Rows; row++)
            for (var column = 0; column < grid.Columns; column++)
            {
                if (grid.Material(column, row) != ArenaTerrainMaterial.Lava) continue;
                var key = (column / ClusterColumns, row / ClusterColumns);
                var centre = ArenaTerrainGrid.CenterOf(column, row);
                var (x, y, count) = clusters.GetValueOrDefault(key);
                clusters[key] = (x + centre.X, y + centre.Y, count + 1);
            }

        var lava = clusters
            .Select(entry => (entry.Key, entry.Value.Count, X: entry.Value.X / entry.Value.Count, Y: entry.Value.Y / entry.Value.Count))
            .OrderBy(cluster => (cluster.X - focus.X) * (cluster.X - focus.X) + (cluster.Y - focus.Y) * (cluster.Y - focus.Y))
            .ThenBy(cluster => cluster.Key.Item1).ThenBy(cluster => cluster.Key.Item2)
            .Take(MaxEmitters)
            .Select(cluster =>
            {
                var id = $"terrain:lava:{cluster.Key.Item1}:{cluster.Key.Item2}";
                return new LightingEmitter(id, id, "point", cluster.X, cluster.Y, 40, LavaColor,
                    6 + 6 * Math.Min(1.0, cluster.Count / 12.0), 200, CastsShadows: false);
            });

        // Roadside torches: static warm points (the road is dark without them); only the few nearest the hunter are emitted.
        var torches = Enumerable.Range(0, grid.Torches.Count / 2)
            .Select(index => (Index: index, X: grid.Torches[index * 2] / 16.0 * ArenaTerrainGrid.CellUnits, Y: grid.Torches[index * 2 + 1] / 16.0 * ArenaTerrainGrid.CellUnits))
            .OrderBy(torch => (torch.X - focus.X) * (torch.X - focus.X) + (torch.Y - focus.Y) * (torch.Y - focus.Y))
            .Take(MaxTorchEmitters)
            .Select(torch =>
            {
                var id = $"terrain:torch:{torch.Index}";
                return new LightingEmitter(id, id, "point", torch.X, torch.Y, TorchHeight, TorchColor, TorchIntensity, TorchRange, CastsShadows: false);
            });

        return lava.Concat(torches).OrderBy(light => light.Id, StringComparer.Ordinal).ToArray();
    }
}
