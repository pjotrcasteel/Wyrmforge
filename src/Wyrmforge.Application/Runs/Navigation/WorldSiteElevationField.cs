using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Navigation;

/// <summary>A world-space terrain sample shared by gameplay, material diagnostics, and the site preview.</summary>
public sealed record WorldSiteElevationSample(
    double HeightMeters,
    double Grade,
    WorldSiteSurfaceId Material,
    double SoilWeight,
    double GrassWeight,
    double RoadWeight,
    double MudWeight,
    double RockWeight,
    double WaterWeight,
    double IceWeight,
    double Moisture,
    bool Walkable);

/// <summary>A sampled display of the authoritative continuous field; it is never a collision grid.</summary>
public sealed record WorldSiteElevationPreview(
    int Columns,
    int Rows,
    IReadOnlyList<WorldSiteElevationSample> Samples);

/// <summary>
/// Continuous, deterministic C# terrain over the existing normalized site frame.
/// Cliff and masonry footprints remain authoritative for abrupt steps. This sampler
/// owns the slopes and material blending; the web renderer only displays its values.
/// </summary>
public static class WorldSiteElevationField
{
    /// <summary>Physical width of one site, in metres; independent of portrait display pixels.</summary>
    public const double SiteWidthMeters = 190;

    /// <summary>Physical length of one site, in metres.</summary>
    public const double SiteLengthMeters = 310;

    /// <summary>Maximum sustainable terrain grade for an actor (rise over horizontal run).</summary>
    public const double MaxWalkableGrade = .62;

    /// <summary>Sample elevation, local grade, drainage and normalized material influences at any world point.</summary>
    public static WorldSiteElevationSample Sample(WorldSiteGeography geography, HuntPoint point)
    {
        ArgumentNullException.ThrowIfNull(geography);
        var x = Math.Clamp(point.X, 0, 1);
        var y = Math.Clamp(point.Y, 0, 1);
        var height = HeightAt(geography, x, y);
        var grade = GradeAt(geography, x, y);

        // A wet low point collects runoff; high exposed rock sheds it. These
        // continuous weights are semantic material inputs, not friction rules.
        var ridge = RidgeWeight(geography, x, y);
        var sheltered = Math.Clamp(geography.Substrate.Shelter + (1 - ridge) * .16, 0, 1);
        var moisture = Math.Clamp(geography.Substrate.Moisture + (1 - ridge) * .12
            - ridge * .24 + sheltered * .08 - grade * .13, 0, 1);
        var trail = PathWeight(geography, x, y);
        var rock = .08 + ridge * 1.15 + (geography.Substrate.Material == WorldSiteSurfaceId.Rock ? .42 : 0);
        var ice = geography.RegionId == "frost" ? rock * .7 : 0;
        if (ice > 0) rock *= .28;
        var grass = (geography.Substrate.Material == WorldSiteSurfaceId.Grass ? 1.0 : .30)
            * (.65 + sheltered * .38) * (1 - ridge * .68);
        var mud = Math.Max(0, moisture - .48) * (geography.Substrate.Material == WorldSiteSurfaceId.Mud ? 1.45 : .6);
        var soil = .42 + (geography.Substrate.Material == WorldSiteSurfaceId.Soil ? .33 : 0);
        var shallowBasin = Math.Clamp((.9 - height) / .6, 0, 1);
        var water = (geography.Substrate.Material == WorldSiteSurfaceId.ShallowWater ? 1.4 : 0)
            + Math.Max(0, moisture - .82) * 1.8 * shallowBasin;
        var wear = Math.Clamp(geography.Substrate.Wear + trail * .5, 0, 1);
        grass *= 1 - wear * .22;
        mud *= 1 + wear * .25;
        var road = trail * 2.4;
        var uncovered = 1 - trail * .75;
        soil *= uncovered;
        grass *= uncovered;
        mud *= uncovered;
        rock *= uncovered;
        water *= 1 - trail * .85;
        ice *= uncovered;
        var total = soil + grass + road + mud + rock + water + ice;
        soil /= total;
        grass /= total;
        road /= total;
        mud /= total;
        rock /= total;
        water /= total;
        ice /= total;
        var dominant = new[]
        {
            (Material: WorldSiteSurfaceId.Soil, Weight: soil),
            (Material: WorldSiteSurfaceId.Grass, Weight: grass),
            (Material: WorldSiteSurfaceId.Road, Weight: road),
            (Material: WorldSiteSurfaceId.Mud, Weight: mud),
            (Material: WorldSiteSurfaceId.Rock, Weight: rock),
            (Material: WorldSiteSurfaceId.ShallowWater, Weight: water),
            (Material: WorldSiteSurfaceId.GlacialIce, Weight: ice),
        }.MaxBy(candidate => candidate.Weight).Material;
        return new WorldSiteElevationSample(height, grade, dominant, soil, grass, road,
            mud, rock, water, ice, moisture, grade <= MaxWalkableGrade);
    }

    /// <summary>Movement-grade predicate without calculating visual material weights on every physics tick.</summary>
    public static bool IsWalkable(WorldSiteGeography geography, HuntPoint point)
    {
        ArgumentNullException.ThrowIfNull(geography);
        return GradeAt(geography, Math.Clamp(point.X, 0, 1), Math.Clamp(point.Y, 0, 1)) <= MaxWalkableGrade;
    }

    /// <summary>Physical slope check used by the existing movement boundary, independently of visual sampling.</summary>
    public static bool BlocksTraversal(WorldSiteGeography geography, Vector2D from, Vector2D to,
        double width, double height)
    {
        ArgumentNullException.ThrowIfNull(geography);
        if (width <= 0 || height <= 0) return false;
        var distance = Vector2D.Distance(from, to);
        var steps = Math.Max(1, (int)Math.Ceiling(distance / 18));
        for (var index = 0; index <= steps; index++)
        {
            var t = index / (double)steps;
            var point = new HuntPoint((from.X + (to.X - from.X) * t) / width,
                (from.Y + (to.Y - from.Y) * t) / height);
            if (!IsWalkable(geography, point)) return true;
        }
        return false;
    }

    /// <summary>Small, deterministic display lattice sampled from the same continuous C# function.</summary>
    public static WorldSiteElevationPreview CreatePreview(WorldSiteGeography geography,
        int columns = 21, int rows = 33)
    {
        ArgumentNullException.ThrowIfNull(geography);
        if (columns < 2 || rows < 2 || columns > 65 || rows > 97)
            throw new ArgumentOutOfRangeException(nameof(columns), "Preview dimensions must be between 2 and 65 by 97.");
        var samples = new WorldSiteElevationSample[columns * rows];
        for (var y = 0; y < rows; y++)
        {
            for (var x = 0; x < columns; x++)
                samples[y * columns + x] = Sample(geography, new HuntPoint(x / (double)(columns - 1),
                    y / (double)(rows - 1)));
        }
        return new WorldSiteElevationPreview(columns, rows, samples);
    }

    private static double GradeAt(WorldSiteGeography geography, double x, double y)
    {
        const double Delta = .0015;
        var west = HeightAt(geography, Math.Max(0, x - Delta), y);
        var east = HeightAt(geography, Math.Min(1, x + Delta), y);
        var north = HeightAt(geography, x, Math.Max(0, y - Delta));
        var south = HeightAt(geography, x, Math.Min(1, y + Delta));
        var dx = (east - west) / (Math.Min(1, x + Delta) - Math.Max(0, x - Delta)) / SiteWidthMeters;
        var dy = (south - north) / (Math.Min(1, y + Delta) - Math.Max(0, y - Delta)) / SiteLengthMeters;
        return Math.Sqrt(dx * dx + dy * dy);
    }

    private static double HeightAt(WorldSiteGeography geography, double x, double y)
    {
        var baseline = .12 + geography.Substrate.Height * .30;
        // Low-amplitude, long-wavelength folds are continuous in world space.
        // Phase comes only from persistent site identity and never from combat RNG.
        var phase = 0u;
        foreach (var character in geography.SiteId)
            phase = unchecked(phase * 16777619u ^ character);
        var offset = (phase % 2048) / 2048d * Math.PI * 2;
        var noise = .08 * Math.Sin(x * 10.5 + y * 3.2 + offset)
            * Math.Sin(y * 8.1 - x * 2.7 + offset * .53);
        var height = Math.Max(0, baseline + noise);
        foreach (var patch in geography.Landscape?.TerrainPatches ?? [])
        {
            var influence = PatchWeight(patch, x, y);
            if (influence <= 0) continue;
            var target = baseline + patch.Height * 3;
            if (patch.Kind.StartsWith("monastery-", StringComparison.Ordinal))
            {
                // A terrace is graded to a single stable level; the building
                // remains an explicit colliding footprint above it.
                height += (target - height) * influence;
            }
            else
            {
                height = Math.Max(height, baseline + patch.Height * 3 * influence);
            }
        }
        return height;
    }

    private static double RidgeWeight(WorldSiteGeography geography, double x, double y)
    {
        var weight = 0d;
        foreach (var patch in geography.Landscape?.TerrainPatches ?? [])
        {
            if (!patch.Kind.StartsWith("mountain-", StringComparison.Ordinal)) continue;
            weight = Math.Max(weight, PatchWeight(patch, x, y));
        }
        return weight;
    }

    private static double PatchWeight(WorldSiteTerrainPatch patch, double x, double y)
    {
        var outline = patch.Outline;
        if (outline.Count < 3) return 0;
        var inside = false;
        var smallest = double.PositiveInfinity;
        for (var index = 0; index < outline.Count; index++)
        {
            var start = outline[index];
            var end = outline[(index + 1) % outline.Count];
            if ((start.Y > y) != (end.Y > y) &&
                x < (end.X - start.X) * (y - start.Y) / (end.Y - start.Y) + start.X)
                inside = !inside;
            var vx = end.X - start.X;
            var vy = end.Y - start.Y;
            var lengthSquared = vx * vx + vy * vy;
            var t = lengthSquared > 0 ? Math.Clamp(((x - start.X) * vx + (y - start.Y) * vy) / lengthSquared, 0, 1) : 0;
            var dx = x - (start.X + vx * t);
            var dy = y - (start.Y + vy * t);
            smallest = Math.Min(smallest, Math.Sqrt(dx * dx + dy * dy));
        }

        // Signed distance softened over metres, with no hard patch/grid edge.
        var signed = inside ? smallest : -smallest;
        var falloff = patch.Kind.StartsWith("monastery-", StringComparison.Ordinal) ? .021 : .052;
        return SmoothStep(-falloff, falloff, signed);
    }

    private static double PathWeight(WorldSiteGeography geography, double x, double y)
    {
        var distance = double.PositiveInfinity;
        var roadHalfWidth = 0d;
        var paths = geography.ScenicPaths.Concat(geography.Landscape?.LocalPaths ?? []);
        foreach (var path in paths)
        {
            for (var index = 1; index < path.Points.Count; index++)
            {
                var start = path.Points[index - 1];
                var end = path.Points[index];
                var vx = (end.X - start.X) * SiteWidthMeters;
                var vy = (end.Y - start.Y) * SiteLengthMeters;
                var lengthSquared = vx * vx + vy * vy;
                var tx = (x - start.X) * SiteWidthMeters;
                var ty = (y - start.Y) * SiteLengthMeters;
                var t = lengthSquared > 0 ? Math.Clamp((tx * vx + ty * vy) / lengthSquared, 0, 1) : 0;
                var dx = tx - vx * t;
                var dy = ty - vy * t;
                var separation = Math.Sqrt(dx * dx + dy * dy);
                if (separation >= distance) continue;
                distance = separation;
                roadHalfWidth = path.Width * SiteWidthMeters * .5;
            }
        }
        return distance == double.PositiveInfinity
            ? 0 : 1 - SmoothStep(roadHalfWidth * .65, roadHalfWidth + 3.5, distance);
    }

    private static double SmoothStep(double start, double end, double value)
    {
        var t = Math.Clamp((value - start) / (end - start), 0, 1);
        return t * t * (3 - 2 * t);
    }
}
