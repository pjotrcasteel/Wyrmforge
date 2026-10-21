using System.Text.Json;

namespace Wyrmforge.Application.World;

public readonly record struct TownPoint(float X, float Y);

public sealed class TownPolygon
{
    public string Id { get; set; } = string.Empty;
    public List<TownPoint> Points { get; set; } = [];
}

public sealed class TownFootprint
{
    public string Id { get; set; } = string.Empty;
    public List<TownPoint> Footprint { get; set; } = [];
}

public sealed class TownDestination
{
    public string Id { get; set; } = string.Empty;
    public float X { get; set; }
    public float Y { get; set; }

    /// <summary>Optional unlocked-building requirement for a civic activity stop.</summary>
    public string? BuildingId { get; set; }
    public string? Activity { get; set; }

    /// <summary>A connected world boundary or doorway. Citizens leave here and may later return.</summary>
    public bool IsExit { get; set; }

    public TownPoint Position => new(X, Y);
}

public sealed class TownForeground
{
    public string Id { get; set; } = string.Empty;
    public float DepthY { get; set; }
    public string Artwork { get; set; } = string.Empty;
    public List<TownPoint> Clip { get; set; } = [];
}

/// <summary>
/// Navigation is authored in intrinsic artwork pixels (not CSS/mobile viewport pixels).
/// Dynamic props register their footprints here and invalidate paths without rewriting roads.
/// </summary>
public sealed class TownNavigationMap
{
    public int Width { get; set; }
    public int Height { get; set; }
    public int CellSize { get; set; } = 16;

    /// <summary>World-space radius of the pedestrian's feet contact disc, NOT sprite height or body width.</summary>
    public float Clearance { get; set; } = 8;

    public float FootRadius => Clearance;
    public List<TownPolygon> Walkable { get; set; } = [];
    public List<TownFootprint> Obstacles { get; set; } = [];
    public List<TownDestination> Destinations { get; set; } = [];
    public List<TownForeground> Occluders { get; set; } = [];

    public int Revision { get; private set; }

    // Re-use collision answers while geometry is unchanged. Walking from one
    // waypoint to the next must never repeat thousands of polygon/edge scans.
    private readonly Dictionary<int, bool> _cachedGridCells = [];
    private readonly Dictionary<long, bool> _cachedGridEdges = [];
    private int _cachedRevision = -1;
    private int _geometryRevision = -1;
    private (TownPolygon Polygon, PolygonBounds Bounds)[] _cachedFloors = [];
    private (TownFootprint Obstacle, PolygonBounds Bounds)[] _cachedObstacles = [];

    private readonly record struct PolygonBounds(float MinX, float MinY, float MaxX, float MaxY)
    {
        public bool Contains(TownPoint p, float margin = 0f) =>
            p.X >= MinX - margin && p.X <= MaxX + margin &&
            p.Y >= MinY - margin && p.Y <= MaxY + margin;

        public bool Intersects(PolygonBounds other) =>
            MinX <= other.MaxX && MaxX >= other.MinX &&
            MinY <= other.MaxY && MaxY >= other.MinY;

        public static PolygonBounds From(IReadOnlyList<TownPoint> points) =>
            new(points.Min(p => p.X), points.Min(p => p.Y),
                points.Max(p => p.X), points.Max(p => p.Y));

        public static PolygonBounds Around(TownPoint a, TownPoint b, float radius = 0f) =>
            new(MathF.Min(a.X, b.X) - radius, MathF.Min(a.Y, b.Y) - radius,
                MathF.Max(a.X, b.X) + radius, MathF.Max(a.Y, b.Y) + radius);
    }

    private void RefreshGeometryCache()
    {
        if (_geometryRevision == Revision) return;
        _cachedFloors = Walkable.Select(p => (p, PolygonBounds.From(p.Points))).ToArray();
        _cachedObstacles = Obstacles.Select(p => (p, PolygonBounds.From(p.Footprint))).ToArray();
        _geometryRevision = Revision;
    }

    public int CachedGridCellCount => _cachedGridCells.Count;
    public int CachedGridEdgeCount => _cachedGridEdges.Count;

    private void RefreshGridCache()
    {
        if (_cachedRevision == Revision) return;
        _cachedGridCells.Clear();
        _cachedGridEdges.Clear();
        _cachedRevision = Revision;
    }

    private bool IsCachedGridCellWalkable(int index, int columns)
    {
        if (_cachedGridCells.TryGetValue(index, out var walkable)) return walkable;
        walkable = IsWalkable(Centre(index, columns));
        _cachedGridCells.Add(index, walkable);
        return walkable;
    }

    private bool IsCachedGridEdgeWalkable(int from, int to, int columns)
    {
        var first = Math.Min(from, to);
        var second = Math.Max(from, to);
        var key = ((long)first << 32) | (uint)second;
        if (_cachedGridEdges.TryGetValue(key, out var walkable)) return walkable;

        walkable = IsSegmentWalkable(Centre(from, columns), Centre(to, columns));
        _cachedGridEdges.Add(key, walkable);
        return walkable;
    }

    public static TownNavigationMap FromJson(string json)
    {
        var result = JsonSerializer.Deserialize<TownNavigationMap>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw new JsonException("No town navigation map was supplied.");
        if (result.Width <= 0 || result.Height <= 0 || result.CellSize is < 8 or > 64 ||
            result.Clearance < 0 || result.Walkable.Count == 0 || result.Destinations.All(d => d.IsExit) ||
            result.Walkable.Any(p => p.Points.Count < 3) || result.Obstacles.Any(p => p.Footprint.Count < 3))
            throw new JsonException("Invalid town navigation geometry.");
        if (result.Destinations.Any(d => !result.IsWalkable(d.Position)))
            throw new JsonException("Town destination is outside the navigable ground.");
        return result;
    }

    /// <summary>Place or move a prop such as a cart; existing pedestrian routes replan on the next tick.</summary>
    public void SetObstacle(TownFootprint footprint)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(footprint.Id);
        if (footprint.Footprint.Count < 3) throw new ArgumentException("A solid prop requires a polygon.", nameof(footprint));
        Obstacles.RemoveAll(existing => existing.Id == footprint.Id);
        Obstacles.Add(footprint);
        Revision++;
    }

    public bool RemoveObstacle(string id)
    {
        if (Obstacles.RemoveAll(existing => existing.Id == id) == 0) return false;
        Revision++;
        return true;
    }

    /// <summary>Only the feet disc collides. A sprite's head can overlap a roof, cart or well visually.</summary>
    public bool IsWalkable(TownPoint feet)
    {
        if (!InsideFloor(feet)) return false;
        if (FootRadius <= 0) return true;

        var radiusSquared = FootRadius * FootRadius;
        if (_cachedObstacles.Any(entry =>
            entry.Bounds.Contains(feet, FootRadius) &&
            DistanceToEdgesSquared(entry.Obstacle.Footprint, feet) < radiusSquared))
            return false;

        for (var i = 0; i < 8; i++)
        {
            var angle = i * MathF.PI / 4f;
            if (!InsideFloor(new(feet.X + MathF.Cos(angle) * FootRadius, feet.Y + MathF.Sin(angle) * FootRadius)))
                return false;
        }
        return true;
    }

    private static float DistanceToEdgesSquared(IReadOnlyList<TownPoint> polygon, TownPoint point)
    {
        var shortest = float.PositiveInfinity;
        for (var i = 0; i < polygon.Count; i++)
        {
            var a = polygon[i];
            var b = polygon[(i + 1) % polygon.Count];
            var dx = b.X - a.X;
            var dy = b.Y - a.Y;
            var lengthSquared = dx * dx + dy * dy;
            var projected = lengthSquared > 0
                ? Math.Clamp(((point.X - a.X) * dx + (point.Y - a.Y) * dy) / lengthSquared, 0f, 1f)
                : 0f;
            var deltaX = point.X - a.X - dx * projected;
            var deltaY = point.Y - a.Y - dy * projected;
            shortest = MathF.Min(shortest, deltaX * deltaX + deltaY * deltaY);
        }
        return shortest;
    }

    public bool IsSegmentWalkable(TownPoint a, TownPoint b)
    {
        if (!IsWalkable(a) || !IsWalkable(b)) return false;
        if (CanSeeAcrossUnchangedFloor(a, b)) return true;

        // Preserve two-pixel collision checks around geometry boundaries and narrow
        // corners. Most ordinary paving routes now avoid hundreds of polygon scans.
        var dx = b.X - a.X;
        var dy = b.Y - a.Y;
        var length = MathF.Sqrt(dx * dx + dy * dy);
        var samples = Math.Max(1, (int)MathF.Ceiling(length / MathF.Min(2f, CellSize / 8f)));
        for (var i = 1; i < samples; i++)
        {
            var t = (float)i / samples;
            if (!IsWalkable(new(a.X + dx * t, a.Y + dy * t))) return false;
        }
        return true;
    }

    private bool CanSeeAcrossUnchangedFloor(TownPoint a, TownPoint b)
    {
        RefreshGeometryCache();
        var corridor = PolygonBounds.Around(a, b, FootRadius);

        // A near collision with *any* obstacle edge must use the exact feet
        // sampling fallback, even if the segment does not intersect the polygon.
        foreach (var obstacle in _cachedObstacles)
        {
            if (!corridor.Intersects(obstacle.Bounds)) continue;
            var points = obstacle.Obstacle.Footprint;
            for (var i = 0; i < points.Count; i++)
            {
                var edgeA = points[i];
                var edgeB = points[(i + 1) % points.Count];
                if (SegmentsIntersect(a, b, edgeA, edgeB) ||
                    DistanceToSegmentSquared(a, edgeA, edgeB) < FootRadius * FootRadius ||
                    DistanceToSegmentSquared(b, edgeA, edgeB) < FootRadius * FootRadius ||
                    DistanceToSegmentSquared(edgeA, a, b) < FootRadius * FootRadius ||
                    DistanceToSegmentSquared(edgeB, a, b) < FootRadius * FootRadius)
                    return false;
            }
        }

        // The nine swept trajectories (feet centre + eight clearance probes)
        // cannot change floor membership without crossing a polygon boundary.
        // Their endpoints were validated by IsWalkable above. No crossing means
        // every intermediate position is safe, without 2px interval resampling.
        if (CrossesFloorBoundary(a, b)) return false;
        for (var i = 0; i < 8; i++)
        {
            var angle = i * MathF.PI / 4f;
            var x = MathF.Cos(angle) * FootRadius;
            var y = MathF.Sin(angle) * FootRadius;
            if (CrossesFloorBoundary(new(a.X + x, a.Y + y), new(b.X + x, b.Y + y)))
                return false;
        }
        return true;
    }

    private bool CrossesFloorBoundary(TownPoint a, TownPoint b)
    {
        var area = PolygonBounds.Around(a, b);
        foreach (var floor in _cachedFloors)
        {
            if (!area.Intersects(floor.Bounds)) continue;
            var points = floor.Polygon.Points;
            for (var i = 0; i < points.Count; i++)
            {
                if (SegmentsIntersect(a, b, points[i], points[(i + 1) % points.Count]))
                    return true;
            }
        }
        return false;
    }

    private static float DistanceToSegmentSquared(TownPoint p, TownPoint a, TownPoint b)
    {
        var x = b.X - a.X;
        var y = b.Y - a.Y;
        var lengthSquared = x * x + y * y;
        var t = lengthSquared > 0f
            ? Math.Clamp(((p.X - a.X) * x + (p.Y - a.Y) * y) / lengthSquared, 0f, 1f)
            : 0f;
        var dx = p.X - a.X - t * x;
        var dy = p.Y - a.Y - t * y;
        return dx * dx + dy * dy;
    }

    /// <summary>A* over the walkable surface, corner-cut prevention, then safe line-of-sight smoothing.</summary>
    public bool TryFindPath(TownPoint start, TownPoint destination, out List<TownPoint> path)
    {
        path = [];
        if (!IsWalkable(start) || !IsWalkable(destination)) return false;
        if (IsSegmentWalkable(start, destination))
        {
            path.Add(destination);
            return true;
        }

        RefreshGridCache();
        var columns = (Width + CellSize - 1) / CellSize;
        var rows = (Height + CellSize - 1) / CellSize;
        var count = columns * rows;
        int? Nearest(TownPoint p)
        {
            var cx = (int)(p.X / CellSize);
            var cy = (int)(p.Y / CellSize);
            for (var radius = 0; radius <= 5; radius++)
            {
                for (var y = Math.Max(0, cy - radius); y <= Math.Min(rows - 1, cy + radius); y++)
                for (var x = Math.Max(0, cx - radius); x <= Math.Min(columns - 1, cx + radius); x++)
                    if (Math.Max(Math.Abs(cx - x), Math.Abs(cy - y)) == radius && IsCachedGridCellWalkable(y * columns + x, columns))
                        return y * columns + x;
            }
            return null;
        }

        var source = Nearest(start);
        var target = Nearest(destination);
        if (source is null || target is null) return false;
        var score = new float[count];
        var previous = new int[count];
        var closed = new bool[count];
        Array.Fill(score, float.PositiveInfinity);
        Array.Fill(previous, -1);
        score[source.Value] = 0f;
        var queue = new PriorityQueue<int, float>();
        queue.Enqueue(source.Value, 0f);
        var directions = new (int X, int Y)[]
        {
            (-1, 0), (1, 0), (0, -1), (0, 1),
            (-1, -1), (-1, 1), (1, -1), (1, 1)
        };

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            if (closed[current]) continue;
            if (current == target.Value) break;
            closed[current] = true;
            var currentX = current % columns;
            var currentY = current / columns;
            var currentPoint = Centre(current, columns);
            foreach (var (stepX, stepY) in directions)
            {
                var nextX = currentX + stepX;
                var nextY = currentY + stepY;
                if (nextX < 0 || nextY < 0 || nextX >= columns || nextY >= rows) continue;
                var next = nextY * columns + nextX;
                if (closed[next]) continue;
                var nextPoint = Centre(next, columns);
                if (!IsCachedGridCellWalkable(next, columns) ||
                    !IsCachedGridEdgeWalkable(current, next, columns)) continue;
                if (stepX != 0 && stepY != 0 &&
                    (!IsCachedGridCellWalkable(currentY * columns + nextX, columns) ||
                     !IsCachedGridCellWalkable(nextY * columns + currentX, columns))) continue;
                var nextScore = score[current] + MathF.Sqrt(stepX * stepX + stepY * stepY);
                if (nextScore >= score[next]) continue;
                score[next] = nextScore;
                previous[next] = current;
                queue.Enqueue(next, nextScore + Distance(nextPoint, Centre(target.Value, columns)) / CellSize);
            }
        }

        if (source != target && previous[target.Value] < 0) return false;
        var reversed = new List<TownPoint>();
        for (var at = target.Value; at != source.Value; at = previous[at])
        {
            if (at < 0) return false;
            reversed.Add(Centre(at, columns));
        }
        reversed.Reverse();
        reversed.Add(destination);

        var cursor = start;
        for (var i = 0; i < reversed.Count;)
        {
            // Start with the farthest waypoint and stop at the first clear
            // segment. The former loop tested every shorter waypoint as well.
            var lastVisible = i;
            for (var j = reversed.Count - 1; j > i; j--)
            {
                if (!IsSegmentWalkable(cursor, reversed[j])) continue;
                lastVisible = j;
                break;
            }
            cursor = reversed[lastVisible];
            path.Add(cursor);
            i = lastVisible + 1;
        }
        return true;
    }

    /// <summary>
    /// Rectangle placeholders must be either fully visible or fully hidden. A
    /// loosely authored foreground polygon must never crop a pedestrian in half.
    /// True per-pixel character occlusion belongs to a future transparent art layer.
    /// </summary>
    public bool IsBodyOccluded(TownPoint feet, float bodyWidth = 16f, float bodyHeight = 30f)
    {
        if (bodyWidth <= 0 || bodyHeight <= 0)
            throw new ArgumentOutOfRangeException(nameof(bodyWidth), "The citizen body must have positive dimensions.");

        var left = feet.X - bodyWidth / 2f;
        var top = feet.Y - bodyHeight;
        var right = feet.X + bodyWidth / 2f;

        return Occluders.Any(foreground =>
            feet.Y < foreground.DepthY &&
            PolygonIntersectsBody(foreground.Clip, left, top, right, feet.Y));
    }

    private static bool PolygonIntersectsBody(IReadOnlyList<TownPoint> polygon, float left, float top, float right, float bottom)
    {
        if (polygon.Count < 3) return false;
        var corners = new TownPoint[]
        {
            new(left, top), new(right, top), new(right, bottom), new(left, bottom)
        };
        if (corners.Any(point => Contains(polygon, point))) return true;
        if (polygon.Any(point => point.X >= left && point.X <= right && point.Y >= top && point.Y <= bottom))
            return true;

        for (var i = 0; i < polygon.Count; i++)
        {
            var next = polygon[(i + 1) % polygon.Count];
            for (var side = 0; side < corners.Length; side++)
                if (SegmentsIntersect(polygon[i], next, corners[side], corners[(side + 1) % corners.Length]))
                    return true;
        }
        return false;
    }

    private static bool SegmentsIntersect(TownPoint a, TownPoint b, TownPoint c, TownPoint d)
    {
        static float Cross(TownPoint first, TownPoint second, TownPoint third) =>
            (second.X - first.X) * (third.Y - first.Y) - (second.Y - first.Y) * (third.X - first.X);
        static bool Between(float n, float first, float second) =>
            n >= MathF.Min(first, second) && n <= MathF.Max(first, second);

        var first = Cross(a, b, c);
        var second = Cross(a, b, d);
        var third = Cross(c, d, a);
        var fourth = Cross(c, d, b);

        if (first * second < 0 && third * fourth < 0) return true;
        if (first == 0 && Between(c.X, a.X, b.X) && Between(c.Y, a.Y, b.Y)) return true;
        if (second == 0 && Between(d.X, a.X, b.X) && Between(d.Y, a.Y, b.Y)) return true;
        if (third == 0 && Between(a.X, c.X, d.X) && Between(a.Y, c.Y, d.Y)) return true;
        return fourth == 0 && Between(b.X, c.X, d.X) && Between(b.Y, c.Y, d.Y);
    }

    public string ForegroundClip(TownForeground occluder) =>
        "polygon(" + string.Join(",", occluder.Clip.Select(p =>
            FormattableString.Invariant($"{p.X / Width * 100:0.###}% {p.Y / Height * 100:0.###}%"))) + ")";

    private TownPoint Centre(int index, int columns) =>
        new((index % columns + .5f) * CellSize, (index / columns + .5f) * CellSize);

    private bool InsideFloor(TownPoint position)
    {
        RefreshGeometryCache();
        return _cachedFloors.Any(entry =>
            entry.Bounds.Contains(position) && Contains(entry.Polygon.Points, position)) &&
            !_cachedObstacles.Any(entry =>
                entry.Bounds.Contains(position) && Contains(entry.Obstacle.Footprint, position));
    }

    private static float Distance(TownPoint a, TownPoint b) =>
        MathF.Sqrt((a.X - b.X) * (a.X - b.X) + (a.Y - b.Y) * (a.Y - b.Y));

    private static bool Contains(IReadOnlyList<TownPoint> polygon, TownPoint position)
    {
        var inside = false;
        for (int i = 0, j = polygon.Count - 1; i < polygon.Count; j = i++)
        {
            var a = polygon[i];
            var b = polygon[j];
            if ((a.Y > position.Y) != (b.Y > position.Y) &&
                position.X < (b.X - a.X) * (position.Y - a.Y) / (b.Y - a.Y) + a.X)
                inside = !inside;
        }
        return inside;
    }
}
