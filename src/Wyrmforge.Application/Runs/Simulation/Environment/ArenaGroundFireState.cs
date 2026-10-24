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
            // A leafbed can be only partially exposed beneath later painted
            // ground. Ignite iff fire overlaps VISIBLE leaf pixels, not solely
            // according to whether the leafbed's centre is covered.
            if (!HasExposedFuelContact(worldPosition, radius, leaf, worldWidth, worldHeight)) continue;
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

    /// <summary>
    /// Sample the actual visible ground stack where a C# fire zone touches a
    /// leafbed. Later opaque material patches hide earlier leaves. The bounded,
    /// deterministic sample grid intentionally prefers no ignition to inventing
    /// fire on a puddle or buried material; it never advances combat RNG.
    /// </summary>
    private bool HasExposedFuelContact(Vector2D fire, double radius, LeafFuel leaf, double width, double height)
    {
        var patch = leaf.Patch;
        var overlays = Recipe.Ground.Skip(leaf.Index + 1)
            .Where(next => next.RadiusX > 0 && next.RadiusY > 0 &&
                Math.Abs(next.X * width - fire.X) <= next.RadiusX * width + radius &&
                Math.Abs(next.Y * height - fire.Y) <= next.RadiusY * height + radius)
            .ToArray();
        if (overlays.Length == 0) return true;

        var patchX = patch.X * width;
        var patchY = patch.Y * height;
        var left = Math.Max(fire.X - radius, patchX - patch.RadiusX * width);
        var right = Math.Min(fire.X + radius, patchX + patch.RadiusX * width);
        var top = Math.Max(fire.Y - radius, patchY - patch.RadiusY * height);
        var bottom = Math.Min(fire.Y + radius, patchY + patch.RadiusY * height);
        if (right <= left || bottom <= top) return false;

        // Six world units per sample, capped for a large area effect. Sample
        // CELL CENTRES so radius-one hits still inspect their true contact.
        var columns = Math.Clamp((int)Math.Ceiling((right - left) / 6), 1, 32);
        var rows = Math.Clamp((int)Math.Ceiling((bottom - top) / 6), 1, 32);
        var squaredRadius = radius * radius;
        for (var y = 0; y < rows; y++)
        {
            var atY = top + (y + .5) * (bottom - top) / rows;
            for (var x = 0; x < columns; x++)
            {
                var atX = left + (x + .5) * (right - left) / columns;
                var dx = atX - fire.X;
                var dy = atY - fire.Y;
                if (dx * dx + dy * dy > squaredRadius) continue;
                var point = new Vector2D(atX, atY);
                if (!Covers(point, patch, width, height)) continue;
                if (overlays.Any(next => Covers(point, next, width, height))) continue;
                return true;
            }
        }
        return false;
    }

    private static bool Touches(Vector2D center, double radius, HuntArenaGenerator.GroundPatch patch,
        double width, double height)
    {
        var at = new Vector2D(patch.X * width, patch.Y * height);
        var dx = Math.Abs(center.X - at.X);
        var dy = Math.Abs(center.Y - at.Y);
        var rx = patch.RadiusX * width;
        var ry = patch.RadiusY * height;
        if (rx <= 0 || ry <= 0) return false;
        var nx = dx / rx;
        var ny = dy / ry;
        if (nx * nx + ny * ny <= 1) return true;

        // Distance to an eccentric ellipse is NOT the distance along the
        // centre-to-fire ray. That shortcut misses real grazing contacts with
        // narrow leafbeds. Project onto the closest boundary via the monotone
        // ellipse Lagrange multiplier; 48 deterministic steps, no simulation RNG.
        var lower = 0d;
        var upper = Math.Max(rx * dx, ry * dy) + rx * rx + ry * ry;
        while (EllipseConstraint(upper, dx, dy, rx, ry) > 1) upper *= 2;
        for (var i = 0; i < 48; i++)
        {
            var middle = (lower + upper) * .5;
            if (EllipseConstraint(middle, dx, dy, rx, ry) > 1) lower = middle;
            else upper = middle;
        }
        var nearestX = rx * rx * dx / (rx * rx + upper);
        var nearestY = ry * ry * dy / (ry * ry + upper);
        var errorX = dx - nearestX;
        var errorY = dy - nearestY;
        return errorX * errorX + errorY * errorY <= radius * radius;
    }

    private static double EllipseConstraint(double multiplier, double dx, double dy, double rx, double ry)
    {
        var x = rx * dx / (rx * rx + multiplier);
        var y = ry * dy / (ry * ry + multiplier);
        return x * x + y * y;
    }

    private static bool Covers(Vector2D world, HuntArenaGenerator.GroundPatch patch, double width, double height)
    {
        var x = (world.X / width - patch.X) / patch.RadiusX;
        var y = (world.Y / height - patch.Y) / patch.RadiusY;
        return x * x + y * y <= 1;
    }
}
