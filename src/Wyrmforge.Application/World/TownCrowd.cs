namespace Wyrmforge.Application.World;

/// <summary>A pedestrian's presentation-independent state in the Refuge road network.</summary>
public sealed class TownCitizen
{
    internal TownCitizen(int id, int startNode, float x, float y, float speed, float idleSeconds)
    {
        Id = id;
        CurrentNode = startNode;
        PreviousNode = -1;
        DestinationNode = -1;
        XPercent = x;
        YPercent = y;
        Speed = speed;
        IdleSeconds = idleSeconds;
    }

    public int Id { get; }
    public float XPercent { get; internal set; }
    public float YPercent { get; internal set; }
    public bool IsWalking => DestinationNode >= 0;
    public int CurrentNode { get; internal set; }
    public int DestinationNode { get; internal set; }
    internal int PreviousNode { get; set; }
    internal float IdleSeconds { get; set; }
    internal float Speed { get; }
}

/// <summary>
/// Seeded, fixed-step-safe ambient pedestrian decisions. Citizens follow authored
/// connected pavement waypoints; they never choose arbitrary points through buildings.
/// No player progress, gameplay RNG, saves or browser APIs are involved.
/// </summary>
public sealed class TownCrowd
{
    private const float SceneAspect = 1672f / 941f;
    private static readonly Waypoint[] Streets =
    [
        new(34f, 68f, [1, 12]),
        new(40f, 76f, [0, 2, 5]),
        new(49f, 73f, [1, 3, 6]),
        new(60f, 76f, [2, 7, 13]),
        new(32f, 86f, [5, 12]),
        new(41f, 87f, [1, 4, 6, 8]),
        new(52f, 86f, [2, 5, 7, 9]),
        new(64f, 87f, [3, 6, 10, 11]),
        new(42f, 94f, [5, 9]),
        new(53f, 94f, [6, 8, 10]),
        new(68f, 94f, [7, 9, 11]),
        new(73f, 85f, [7, 10, 13]),
        new(28f, 76f, [0, 4]),
        new(75f, 73f, [3, 11])
    ];

    private readonly List<TownCitizen> _citizens = [];
    private uint _randomState;

    public TownCrowd(int seed = 205, int citizenCount = 7)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(citizenCount);
        if (citizenCount > Streets.Length)
            throw new ArgumentOutOfRangeException(nameof(citizenCount), "Each citizen needs a free initial waypoint.");

        _randomState = seed == 0 ? 0xA341316Cu : unchecked((uint)seed);
        var spawnNodes = new[] { 4, 1, 2, 3, 6, 10, 11, 0, 5, 7, 8, 9, 12, 13 };
        for (var i = 0; i < citizenCount; i++)
        {
            var node = spawnNodes[i];
            _citizens.Add(new TownCitizen(i + 1, node, Streets[node].X, Streets[node].Y,
                7f + NextInt(5), .3f + NextInt(18) / 10f));
        }
    }

    public IReadOnlyList<TownCitizen> Citizens => _citizens;

    public void Step(TimeSpan elapsed)
    {
        // Background-tab resumption must not teleport a pedestrian across the town.
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

            var destination = Streets[citizen.DestinationNode];
            var dx = destination.X - citizen.XPercent;
            var dy = destination.Y - citizen.YPercent;
            var distance = MathF.Sqrt(dx * dx * SceneAspect * SceneAspect + dy * dy);
            var travel = citizen.Speed * seconds;

            if (distance <= travel)
            {
                citizen.XPercent = destination.X;
                citizen.YPercent = destination.Y;
                citizen.PreviousNode = citizen.CurrentNode;
                citizen.CurrentNode = citizen.DestinationNode;
                citizen.DestinationNode = -1;
                citizen.IdleSeconds = .4f + NextInt(21) / 10f;
            }
            else
            {
                var fraction = travel / distance;
                citizen.XPercent += dx * fraction;
                citizen.YPercent += dy * fraction;
            }
        }
    }

    private void ChooseNextStop(TownCitizen citizen)
    {
        var neighbours = Streets[citizen.CurrentNode].Neighbours;
        var candidates = neighbours.Where(next =>
            !_citizens.Any(other => other != citizen &&
                (other.DestinationNode == next ||
                 (!other.IsWalking && other.CurrentNode == next) ||
                 (other.CurrentNode == next && other.DestinationNode == citizen.CurrentNode)))).ToArray();
        if (candidates.Length == 0)
        {
            citizen.IdleSeconds = .3f;
            return;
        }

        var forward = candidates.Where(node => node != citizen.PreviousNode).ToArray();
        var choices = forward.Length > 0 ? forward : candidates;
        citizen.DestinationNode = choices[NextInt(choices.Length)];
        citizen.IdleSeconds = 0;
    }

    private int NextInt(int maximum)
    {
        _randomState ^= _randomState << 13;
        _randomState ^= _randomState >> 17;
        _randomState ^= _randomState << 5;
        return (int)(_randomState % (uint)maximum);
    }

    private sealed record Waypoint(float X, float Y, int[] Neighbours);
}
