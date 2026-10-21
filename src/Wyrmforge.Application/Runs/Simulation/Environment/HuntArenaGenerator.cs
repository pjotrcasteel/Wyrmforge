using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Reproducible, gameplay-authoritative arena dressing. The map seed, node identity and habitat
/// drive a separate random stream: opening a prop never consumes combat/spawn randomness.
/// Coordinates are normalized to the arena world, never to the current phone viewport.
/// </summary>
public static class HuntArenaGenerator
{
    public sealed record Prop(int Id, string Kind, double X, double Y, double Radius, double Health, string? DropKind);

    public static double WyrmInfluence(int stage, bool preLair) =>
        Math.Clamp((Math.Max(1, stage) - 1) / 7d + (preLair ? .12 : 0), 0, 1);


    // Stable, independent woodland recipe consumed by the C# simulation AND the JS floor painter.
    public sealed record TrailPoint(double X, double Y, double Width);
    public sealed record GroundPatch(string Kind, double X, double Y, double RadiusX, double RadiusY);
    public sealed record WetForestRecipe(string Site, double SiteX, double SiteY,
        IReadOnlyList<TrailPoint> Trail, IReadOnlyList<GroundPatch> Ground);

    public static WetForestRecipe GenerateWetForest(int seed)
    {
        var rng = new Random(unchecked(seed ^ 0x2F84A957));
        string[] sites = ["abandoned-camp", "forgotten-graves", "ruined-waystone", "broken-wagon"];
        var site = sites[rng.Next(sites.Length)];
        var siteX = .32 + rng.NextDouble() * .36;
        var siteY = .38 + rng.NextDouble() * .24;
        var trail = new List<TrailPoint>();
        var x = .31 + rng.NextDouble() * .38;
        for (var i = 0; i <= 8; i++)
        {
            x = Math.Clamp(x + (rng.NextDouble() - .5) * .24, .18, .82);
            trail.Add(new TrailPoint(x, i / 8d, .085 + rng.NextDouble() * .075));
        }
        var ground = new List<GroundPatch> { new("clearing", siteX, siteY, .08, .052) };
        for (var i = 0; i < 48; i++)
        {
            var type = rng.NextDouble();
            ground.Add(new GroundPatch(type < .20 ? "puddle" : type < .43 ? "leafbed" : type < .70 ? "moss" : "mud",
                .045 + rng.NextDouble() * .91, .03 + rng.NextDouble() * .94,
                .012 + rng.NextDouble() * .044, .008 + rng.NextDouble() * .026));
        }
        return new WetForestRecipe(site, siteX, siteY, trail, ground);
    }

    public static IReadOnlyList<Prop> Generate(int seed, WyrmrealmHabitat habitat, int stage, bool preLair)
    {
        var rng = new Random(unchecked(seed ^ 0x39A86C21));
        var influence = WyrmInfluence(stage, preLair);
        var wetForest = habitat == WyrmrealmHabitat.WetForest;
        var otherForest = habitat is WyrmrealmHabitat.Outskirts or WyrmrealmHabitat.FrozenRoad
            or WyrmrealmHabitat.SnowboundPines;
        var frost = WyrmrealmHabitatCatalog.School(habitat) == SpellSchool.Frost;
        var recipe = wetForest ? GenerateWetForest(seed) : null;
        var desired = wetForest ? 30 + rng.Next(8) : otherForest ? 16 : 12;
        var props = new List<Prop>(desired);
        if (recipe is not null)
        {
            string siteKind = recipe.Site switch
            {
                "abandoned-camp" => "camp-remains", "forgotten-graves" => "grave-marker",
                "ruined-waystone" => "waystone", _ => "broken-cart",
            };
            Add(new Prop(1, siteKind, recipe.SiteX, recipe.SiteY, 19, 80, null));
            for (var i = 0; i < 3; i++)
            {
                var angle = (i * .65 + rng.NextDouble() * .2) * Math.PI;
                var cx = recipe.SiteX + Math.Cos(angle) * (.055 + rng.NextDouble() * .03);
                var cy = recipe.SiteY + Math.Sin(angle) * (.05 + rng.NextDouble() * .02);
                var kind = recipe.Site switch
                {
                    "forgotten-graves" => "grave-marker", "ruined-waystone" => "moss-rock",
                    "abandoned-camp" => i == 0 ? "barrel" : "crate", _ => i == 0 ? "crate" : "fallen-log",
                };
                Add(Build(kind, cx, cy));
            }
        }
        for (var attempt = 0; attempt < desired * 45 && props.Count < desired; attempt++)
        {
            var x = .055 + rng.NextDouble() * .89;
            var y = .04 + rng.NextDouble() * .92;
            if (recipe is not null)
            {
                // A winding worn trail is usually clear, but there are no straight mandatory combat lanes.
                var nearest = recipe.Trail.Min(point => Math.Abs(point.X - x) + Math.Abs(point.Y - y) * .55);
                if (nearest < .072 && rng.NextDouble() < .72) continue;
                // Canopy comes in thickets with natural pockets, never a uniform 16-prop rectangle.
                if (Math.Sin(x * 31 + seed * .0007) * Math.Cos(y * 23 - seed * .0013) < -.42 &&
                    rng.NextDouble() < .66) continue;
            }
            var roll = rng.NextDouble();
            var kind = wetForest
                ? roll < .43 ? influence > .58 && rng.NextDouble() < .52 ? "dead-tree" : "pine"
                    : roll < .56 ? "moss-rock" : roll < .68 ? "fallen-log" : roll < .80 ? "stump"
                    : roll < .90 ? "dead-tree" : roll < .95 ? "barrel" : "crate"
                : otherForest && roll < .28 ? frost ? "pine-snow" : "pine"
                    : roll < .28 + influence * .27 ? frost ? "frozen-urn" : "ember-urn"
                    : roll < .52 ? "barrel" : roll < .77 ? "crate" : otherForest ? "stump" : "urn";
            Add(Build(kind, x, y));
        }
        return props;

        Prop Build(string kind, double x, double y)
        {
            var radius = kind switch
            {
                "fallen-log" or "broken-cart" => 23, "moss-rock" or "waystone" => 17,
                "stump" => 16, _ => 12,
            };
            var hp = kind is "pine" or "pine-snow" or "dead-tree" ? 75
                : kind is "moss-rock" or "waystone" ? 125 : kind == "fallen-log" ? 45 : 25;
            var roll = rng.NextDouble();
            var drop = kind is "pine" or "pine-snow" or "dead-tree" or "moss-rock" or "grave-marker" or "waystone"
                ? null : roll < .12 ? "experience" : roll < .18 ? "health" : null;
            return new Prop(props.Count + 1, kind, x, y, radius, hp, drop);
        }

        void Add(Prop prop)
        {
            const double width = 950, height = 1550;
            if (prop.X < .045 || prop.X > .955 || prop.Y < .04 || prop.Y > .96) return;
            var x = prop.X * width;
            var y = prop.Y * height;
            // Spawn safety is a radius around the mage, not an imposed cross-shaped map division.
            if (Math.Hypot(x - width * .5, y - height * .5) < prop.Radius + 88) return;
            if (props.Any(existing => Math.Pow((existing.X - prop.X) * width, 2) +
                Math.Pow((existing.Y - prop.Y) * height, 2) < Math.Pow(existing.Radius + prop.Radius + 15, 2))) return;
            props.Add(prop);
            if (wetForest && !OpenToAllEdges(props)) props.RemoveAt(props.Count - 1);
        }
    }

    // Validate movement in a grid against the same solid circles used at runtime.
    // No prescribed clear bands: reject individual props that disconnect reachable woodland.
    private static bool OpenToAllEdges(IReadOnlyList<Prop> props)
    {
        const int width = 950, height = 1550, cols = 38, rows = 62;
        var solid = new bool[cols, rows];
        for (var y = 0; y < rows; y++)
        for (var x = 0; x < cols; x++)
        {
            var px = (x + .5) * width / cols;
            var py = (y + .5) * height / rows;
            solid[x, y] = props.Any(prop => Math.Pow(px - prop.X * width, 2) +
                Math.Pow(py - prop.Y * height, 2) < Math.Pow(prop.Radius + 14, 2));
        }
        var seen = new bool[cols, rows];
        var queue = new Queue<(int X, int Y)>();
        queue.Enqueue((cols / 2, rows / 2));
        seen[cols / 2, rows / 2] = true;
        while (queue.TryDequeue(out var cell))
        {
            foreach (var (dx, dy) in new (int X, int Y)[] { (-1, 0), (1, 0), (0, -1), (0, 1) })
            {
                var x = cell.X + dx;
                var y = cell.Y + dy;
                if (x < 0 || x >= cols || y < 0 || y >= rows || solid[x, y] || seen[x, y]) continue;
                seen[x, y] = true;
                queue.Enqueue((x, y));
            }
        }
        return seen[2, rows / 2] && seen[cols - 3, rows / 2] &&
            seen[cols / 2, 2] && seen[cols / 2, rows - 3];
    }
}
