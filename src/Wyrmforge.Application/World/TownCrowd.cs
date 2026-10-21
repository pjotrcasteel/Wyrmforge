namespace Wyrmforge.Application.World;

/// <summary>A Refuge pedestrian; feet use authored scene pixels, never viewport CSS coordinates.</summary>
public sealed class TownCitizen
{
    internal TownCitizen(int id, int startNode, TownPoint start, float speed, float idleSeconds)
    {
        Id = id;
        CurrentNode = startNode;
        PreviousNode = -1;
        DestinationNode = -1;
        Position = start;
        Speed = speed;
        IdleSeconds = idleSeconds;
    }

    public int Id { get; }
    public TownPoint Position { get; internal set; }
    public float XPercent => Position.X / TownWidth * 100;
    public float YPercent => Position.Y / TownHeight * 100;
    public bool IsWalking => DestinationNode >= 0;
    public int CurrentNode { get; internal set; }
    public int DestinationNode { get; internal set; }

    internal float TownWidth { get; set; }
    internal float TownHeight { get; set; }
    internal int PreviousNode { get; set; }
    internal float IdleSeconds { get; set; }
    internal float Speed { get; }
    internal List<TownPoint> Path { get; set; } = [];
    internal int PathIndex { get; set; }
    internal int PathRevision { get; set; }
    internal float WaitingSeconds { get; set; }
}

/// <summary>
/// Seeded ambient decision making. The map owns roads and obstacles; a cart or
/// new solid prop invalidates existing paths and A* reroutes without NPC-specific patches.
/// </summary>
public sealed class TownCrowd
{
    private readonly List<TownCitizen> _citizens = [];
    private readonly TownNavigationMap _navigation;
    private uint _randomState;

    public TownCrowd(TownNavigationMap navigation, int seed = 205, int citizenCount = 7)
    {
        ArgumentNullException.ThrowIfNull(navigation);
        ArgumentOutOfRangeException.ThrowIfNegative(citizenCount);
        if (citizenCount > navigation.Destinations.Count)
            throw new ArgumentOutOfRangeException(nameof(citizenCount), "Every citizen needs a separate starting place.");

        _navigation = navigation;
        _randomState = seed == 0 ? 0xA341316Cu : unchecked((uint)seed);
        var starts = Enumerable.Range(0, navigation.Destinations.Count).ToArray();
        for (var i = 0; i < citizenCount; i++)
        {
            var start = starts[i];
            var position = navigation.Destinations[start].Position;
            if (!navigation.IsWalkable(position))
                throw new ArgumentException("Citizen spawn must be on walkable ground.", nameof(navigation));
            _citizens.Add(new TownCitizen(i + 1, start, position, 39f + NextInt(13), .3f + NextInt(18) / 10f)
            {
                TownWidth = navigation.Width,
                TownHeight = navigation.Height
            });
        }
    }

    public IReadOnlyList<TownCitizen> Citizens => _citizens;
    public TownNavigationMap Navigation => _navigation;

    public void Step(TimeSpan elapsed)
    {
        // A background-tab resumption cannot make an NPC jump through scenery.
        var seconds = (float)Math.Clamp(elapsed.TotalSeconds, 0d, .1d);
        if (seconds <= 0) return;

        foreach (var citizen in _citizens)
        {
            if (!citizen.IsWalking)
            {
                citizen.IdleSeconds -= seconds;
                if (citizen.IdleSeconds <= 0) ChooseNextStop(citizen);
                continue;
            }

            if (citizen.PathRevision != _navigation.Revision ||
                citizen.PathIndex >= citizen.Path.Count ||
                !_navigation.IsSegmentWalkable(citizen.Position, citizen.Path[citizen.PathIndex]))
            {
                var destination = _navigation.Destinations[citizen.DestinationNode].Position;
                if (!_navigation.TryFindPath(citizen.Position, destination, out var path))
                {
                    citizen.DestinationNode = -1;
                    citizen.IdleSeconds = .7f;
                    citizen.Path = [];
                    continue;
                }
                citizen.Path = path;
                citizen.PathIndex = 0;
                citizen.PathRevision = _navigation.Revision;
            }

            Move(citizen, seconds);
        }
    }

    private void Move(TownCitizen citizen, float seconds)
    {
        var travel = citizen.Speed * seconds;
        while (travel > 0 && citizen.PathIndex < citizen.Path.Count)
        {
            var next = citizen.Path[citizen.PathIndex];
            var dx = next.X - citizen.Position.X;
            var dy = next.Y - citizen.Position.Y;
            var distance = MathF.Sqrt(dx * dx + dy * dy);
            var step = MathF.Min(travel, distance);
            var position = distance <= .0001f
                ? next
                : new TownPoint(citizen.Position.X + dx * step / distance, citizen.Position.Y + dy * step / distance);

            // Collision uses foot position; never overlap another pedestrian.
            if (_citizens.Any(other => other != citizen && Distance(other.Position, position) < 20f))
            {
                citizen.WaitingSeconds += seconds;
                if (citizen.WaitingSeconds > 2.5f)
                {
                    citizen.DestinationNode = -1;
                    citizen.IdleSeconds = .5f + NextInt(12) / 10f;
                    citizen.Path = [];
                    citizen.WaitingSeconds = 0;
                }
                return;
            }

            citizen.Position = position;
            citizen.WaitingSeconds = 0;
            travel -= step;
            if (distance <= step + .0001f) citizen.PathIndex++;
            else break;
        }

        if (citizen.PathIndex < citizen.Path.Count) return;
        citizen.PreviousNode = citizen.CurrentNode;
        citizen.CurrentNode = citizen.DestinationNode;
        citizen.DestinationNode = -1;
        citizen.Path = [];
        citizen.IdleSeconds = .5f + NextInt(22) / 10f;
    }

    private void ChooseNextStop(TownCitizen citizen)
    {
        var anchors = Enumerable.Range(0, _navigation.Destinations.Count)
            .Where(index => index != citizen.CurrentNode &&
                !_citizens.Any(other => other != citizen &&
                    (other.DestinationNode == index || (!other.IsWalking && other.CurrentNode == index))))
            .ToArray();
        // Prefer a different location rather than oscillating between two stops.
        var preferred = anchors.Where(index => index != citizen.PreviousNode).ToArray();
        var candidates = preferred.Length > 0 ? preferred : anchors;
        var offset = candidates.Length > 0 ? NextInt(candidates.Length) : 0;

        for (var i = 0; i < candidates.Length; i++)
        {
            var destinationNode = candidates[(i + offset) % candidates.Length];
            var target = _navigation.Destinations[destinationNode].Position;
            if (!_navigation.TryFindPath(citizen.Position, target, out var path)) continue;
            citizen.DestinationNode = destinationNode;
            citizen.Path = path;
            citizen.PathIndex = 0;
            citizen.PathRevision = _navigation.Revision;
            citizen.IdleSeconds = 0;
            return;
        }
        citizen.IdleSeconds = .6f;
    }

    private static float Distance(TownPoint a, TownPoint b) =>
        MathF.Sqrt((a.X - b.X) * (a.X - b.X) + (a.Y - b.Y) * (a.Y - b.Y));

    private int NextInt(int maximum)
    {
        _randomState ^= _randomState << 13;
        _randomState ^= _randomState >> 17;
        _randomState ^= _randomState << 5;
        return (int)(_randomState % (uint)maximum);
    }
}
