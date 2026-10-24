using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Test-lab fuel state backed by the SAME deterministic Wet Forest ground
/// material recipe used by the existing renderer. Not a new terrain painter.
/// </summary>
internal sealed class ArenaGroundFireState(HuntArenaGenerator.WetForestRecipe recipe)
{
    private const double LeafFireSeconds = 2.4;
    private readonly List<LeafFuel> leaves = recipe.Ground
        .Select((patch, index) => new { Patch = patch, Index = index })
        .Where(x => x.Patch.Kind == "leafbed")
        .Select(x => new LeafFuel(x.Index, x.Patch)).ToList();

    private sealed class LeafFuel(int index, HuntArenaGenerator.GroundPatch patch)
    {
        public int Index { get; } = index;
        public HuntArenaGenerator.GroundPatch Patch { get; } = patch;
        public double BurningSeconds { get; set; }
        public bool Charred { get; set; }
    }

    public HuntArenaGenerator.WetForestRecipe Recipe { get; } = recipe;

    public int Ignite(Vector2D worldPosition, double worldWidth, double worldHeight, double radius)
    {
        if (radius <= 0 || worldWidth <= 0 || worldHeight <= 0) return 0;
        var ignited = 0;
        foreach (var leaf in leaves)
        {
            if (leaf.Charred || !Touches(worldPosition, radius, leaf.Patch, worldWidth, worldHeight)) continue;
            // The ground recipe is drawn in list order. A subsequent clearing,
            // puddle or mud layer that covers this exact leafbed centre must
            // remain the topmost material, not a secret fireable leaf texture.
            var center = new Vector2D(leaf.Patch.X * worldWidth, leaf.Patch.Y * worldHeight);
            var covered = recipe.Ground.Skip(leaf.Index + 1)
                .Any(patch => Covers(center, patch, worldWidth, worldHeight));
            if (covered) continue;
            leaf.Charred = true;
            leaf.BurningSeconds = LeafFireSeconds;
            ignited++;
        }
        return ignited;
    }

    public void Advance(double delta)
    {
        if (delta <= 0) return;
        foreach (var leaf in leaves)
            leaf.BurningSeconds = Math.Max(0, leaf.BurningSeconds - delta);
    }

    public IReadOnlyList<ArenaGroundScorchRenderSnapshot> Snapshot() =>
        leaves.Where(leaf => leaf.Charred)
            .Select(leaf => new ArenaGroundScorchRenderSnapshot(
                leaf.Index, leaf.Patch.X, leaf.Patch.Y, leaf.Patch.RadiusX, leaf.Patch.RadiusY,
                leaf.BurningSeconds, leaf.BurningSeconds <= 0)).ToArray();

    private static bool Touches(Vector2D center, double radius, HuntArenaGenerator.GroundPatch patch,
        double width, double height)
    {
        var at = new Vector2D(patch.X * width, patch.Y * height);
        var dx = Math.Abs(center.X - at.X);
        var dy = Math.Abs(center.Y - at.Y);
        var rx = patch.RadiusX * width;
        var ry = patch.RadiusY * height;
        // Conservative ellipse/circle test. This intentionally under-ignites
        // narrow corners instead of scorching material the spell never touched.
        var scale = Math.Min(rx, ry);
        return scale > 0 && Math.Sqrt(Math.Pow(dx / rx, 2) + Math.Pow(dy / ry, 2)) <= 1 + radius / scale;
    }

    private static bool Covers(Vector2D world, HuntArenaGenerator.GroundPatch patch, double width, double height)
    {
        var x = (world.X / width - patch.X) / patch.RadiusX;
        var y = (world.Y / height - patch.Y) / patch.RadiusY;
        return x * x + y * y <= 1;
    }
}
