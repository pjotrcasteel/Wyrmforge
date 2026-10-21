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

    /// <summary>False while a citizen is away or entering behind an exterior threshold.</summary>
    public bool IsPresent { get; internal set; } = true;
    public int DepartureCount { get; internal set; }
    public string? LastExitId { get; internal set; }
    public string? WorkBuildingId { get; internal set; }
    public string? CurrentActivity { get; internal set; }
    public bool IsWorking => IsPresent && !IsWalking && WorkBuildingId is not null;
    public string? AssignedBuildingId { get; internal set; }
    internal int AssignedWorkNode { get; set; } = -1;

    internal float TownWidth { get; set; }
    internal float TownHeight { get; set; }
    internal int PreviousNode { get; set; }
    internal float IdleSeconds { get; set; }
    internal float Speed { get; }
    internal List<TownPoint> Path { get; set; } = [];
    internal int PathIndex { get; set; }
    internal int PathRevision { get; set; }
    internal float WaitingSeconds { get; set; }
    internal int AvoidanceSide { get; set; } = 1;
    internal float AwaySeconds { get; set; }
    internal bool IsReturning { get; set; }
    internal TownPoint EntryOrigin { get; set; }
}

/// <summary>
/// Seeded ambient decision making. The map owns roads and obstacles; a cart or
/// new solid prop invalidates existing paths and A* reroutes without NPC-specific patches.
/// </summary>
public sealed class TownCrowd
{
    private readonly List<TownCitizen> _citizens = [];
    private readonly TownNavigationMap _navigation;
    private readonly HashSet<string> _openBuildings;
    private uint _randomState;
    public int PathfindCount { get; private set; }
    public double PathfindTotalMilliseconds { get; private set; }

    private bool TryPath(TownPoint start, TownPoint target, out List<TownPoint> path)
    {
        var startTick = System.Diagnostics.Stopwatch.GetTimestamp();
        var found = _navigation.TryFindPath(start, target, out path);
        PathfindTotalMilliseconds += System.Diagnostics.Stopwatch.GetElapsedTime(startTick).TotalMilliseconds;
        PathfindCount++;
        return found;
    }

    public TownCrowd(TownNavigationMap navigation, int seed = 205, int citizenCount = 7,
        IEnumerable<string>? openBuildings = null)
    {
        ArgumentNullException.ThrowIfNull(navigation);
        ArgumentOutOfRangeException.ThrowIfNegative(citizenCount);
        if (citizenCount > navigation.Destinations.Count(destination => !destination.IsExit))
            throw new ArgumentOutOfRangeException(nameof(citizenCount), "Every citizen needs a separate starting place.");

        _navigation = navigation;
        _openBuildings = new HashSet<string>(openBuildings ?? [], StringComparer.Ordinal);
        _randomState = seed == 0 ? 0xA341316Cu : unchecked((uint)seed);
        // Reuse the existing seven actors: opening a building relocates an initial
        // worker to its forecourt rather than adding more NPCs or a second timer.
        var starts = Enumerable.Range(0, navigation.Destinations.Count)
            .Where(index => !navigation.Destinations[index].IsExit &&
                            navigation.Destinations[index].BuildingId is { } building &&
                            _openBuildings.Contains(building))
            .Concat(Enumerable.Range(0, navigation.Destinations.Count)
                .Where(index => !navigation.Destinations[index].IsExit &&
                                navigation.Destinations[index].BuildingId is null))
            .ToArray();
        // Two authored workstations per unlocked building; retain at least three
        // residents to roam independently. Four open buildings yield 8 workers
        // and 3 roamers (11 actors), not a second simulation or timer.
        var workerStops = navigation.Destinations.Count(destination =>
            destination.BuildingId is { } building && _openBuildings.Contains(building));
        var population = citizenCount == 0 ? 0 : Math.Max(citizenCount, workerStops + 3);
        if (population > starts.Length)
            throw new ArgumentOutOfRangeException(nameof(citizenCount), "Not enough distinct work and roaming starts.");
        for (var i = 0; i < population; i++)
        {
            var start = starts[i];
            var position = navigation.Destinations[start].Position;
            if (!navigation.IsWalkable(position))
                throw new ArgumentException("Citizen spawn must be on walkable ground.", nameof(navigation));
            var destination = navigation.Destinations[start];
            _citizens.Add(new TownCitizen(i + 1, start, position, 39f + NextInt(13),
                destination.BuildingId is null ? .3f + NextInt(18) / 10f : 4f + NextInt(40) / 10f)
            {
                TownWidth = navigation.Width,
                TownHeight = navigation.Height,
                WorkBuildingId = destination.BuildingId,
                CurrentActivity = destination.Activity,
                AssignedBuildingId = destination.BuildingId,
                AssignedWorkNode = destination.BuildingId is null ? -1 : start
            });
        }
    }

    public IReadOnlyList<TownCitizen> Citizens => _citizens;
    public int ActiveWorkers => _citizens.Count(citizen => citizen.IsWorking);
    public int AssignedWorkers => _citizens.Count(citizen => citizen.AssignedWorkNode >= 0);
    public int PresentCitizens => _citizens.Count(citizen => citizen.IsPresent);
    public int AwayCitizens => _citizens.Count - PresentCitizens;
    public TownNavigationMap Navigation => _navigation;

    public void SetOpenBuildings(IEnumerable<string> buildingIds)
    {
        ArgumentNullException.ThrowIfNull(buildingIds);
        var updated = new HashSet<string>(buildingIds, StringComparer.Ordinal);
        if (_openBuildings.SetEquals(updated)) return;

        _openBuildings.Clear();
        _openBuildings.UnionWith(updated);
        foreach (var person in _citizens)
        {
            if (person.AssignedBuildingId is { } assignment && !_openBuildings.Contains(assignment))
            {
                person.AssignedBuildingId = null;
                person.AssignedWorkNode = -1;
            }
            if (person.WorkBuildingId is { } work && !_openBuildings.Contains(work))
            {
                person.WorkBuildingId = null;
                person.CurrentActivity = null;
                person.IdleSeconds = .5f;
            }
            if (person.DestinationNode < 0) continue;
            var destination = _navigation.Destinations[person.DestinationNode];
            if (destination.BuildingId is not { } building || _openBuildings.Contains(building)) continue;
            person.DestinationNode = -1;
            person.Path = [];
            person.IdleSeconds = .5f;
        }

        EnsureWorkerCoverage();
    }

    private void EnsureWorkerCoverage()
    {
        for (var index = 0; index < _navigation.Destinations.Count; index++)
        {
            var destination = _navigation.Destinations[index];
            if (destination.BuildingId is not { } building || !_openBuildings.Contains(building) ||
                _citizens.Any(citizen => citizen.AssignedWorkNode == index))
                continue;

            var available = _citizens.Count(citizen => citizen.AssignedWorkNode < 0);
            // Keep at least three free-roaming residents. Prefer reassigning an
            // existing citizen; a new worker is only spawned when the pool is full.
            var citizen = available > 3
                ? _citizens.FirstOrDefault(c => c.AssignedWorkNode < 0)
                : null;
            if (citizen is null)
            {
                // New staff appear at an unlocked workplace rather than teleporting
                // an already visible resident across the town.
                citizen = CreateWorker(index);
            }
            citizen.AssignedWorkNode = index;
            citizen.AssignedBuildingId = building;
            if (citizen.CurrentNode == index)
            {
                citizen.WorkBuildingId = building;
                citizen.CurrentActivity = destination.Activity;
                citizen.IdleSeconds = 4f;
            }
            else
            {
                TryChoose(citizen, [index]);
            }
        }
    }

    private TownCitizen CreateWorker(int destinationIndex)
    {
        var station = _navigation.Destinations[destinationIndex];
        var citizen = new TownCitizen(_citizens.Count + 1, destinationIndex, station.Position,
            39f + NextInt(13), 4f + NextInt(40) / 10f)
        {
            TownWidth = _navigation.Width,
            TownHeight = _navigation.Height,
            WorkBuildingId = station.BuildingId,
            CurrentActivity = station.Activity
        };
        _citizens.Add(citizen);
        return citizen;
    }

    public void Step(TimeSpan elapsed)
    {
        // A background-tab resumption cannot make an NPC jump through scenery.
        var seconds = (float)Math.Clamp(elapsed.TotalSeconds, 0d, .1d);
        if (seconds <= 0) return;

        foreach (var citizen in _citizens)
        {
            if (citizen.AwaySeconds > 0)
            {
                citizen.AwaySeconds = MathF.Max(0, citizen.AwaySeconds - seconds);
                if (citizen.AwaySeconds == 0)
                {
                    // Return from the same hidden passage; no visible teleport or newly invented street.
                    citizen.IsReturning = true;
                    citizen.EntryOrigin = citizen.Position;
                    ChooseNextStop(citizen);
                }
                continue;
            }

            if (!citizen.IsWalking)
            {
                citizen.IdleSeconds -= seconds;
                if (citizen.IdleSeconds <= 0) ChooseNextStop(citizen);
                continue;
            }

            // A validated route stays clear until SetObstacle/RemoveObstacle changes the map.
            // Rechecking every remaining segment on every 100 ms tick caused visible iPhone stalls.
            if (citizen.PathRevision != _navigation.Revision || citizen.PathIndex >= citizen.Path.Count)
            {
                var destination = _navigation.Destinations[citizen.DestinationNode].Position;
                if (!TryPath(citizen.Position, destination, out var path))
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

            // Recheck only the next foot position, not the whole route. A path
            // sampled earlier can still skim a polygon edge between grid samples.
            if (!_navigation.IsWalkable(position))
            {
                citizen.WaitingSeconds += seconds;
                citizen.PathRevision = -1;
                if (citizen.WaitingSeconds > 2.5f)
                {
                    citizen.DestinationNode = -1;
                    citizen.IdleSeconds = .5f + NextInt(12) / 10f;
                    citizen.Path = [];
                    citizen.WaitingSeconds = 0;
                }
                return;
            }

            // A returning citizen must reserve a clear foot circle before becoming visible.
            var willAppear = citizen.IsReturning && Distance(position, citizen.EntryOrigin) >= 52f;
            if ((citizen.IsPresent || willAppear) && HasNeighbourAt(citizen, position))
            {
                // A short, deterministic paved sidestep breaks head-on standoffs
                // without adding a dynamic obstacle to the cached A* navigation.
                if (TrySidestep(citizen, dx, dy, distance, step)) return;
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
            if (citizen.IsReturning && Distance(citizen.Position, citizen.EntryOrigin) >= 52f)
            {
                citizen.IsReturning = false;
                citizen.IsPresent = true;
            }
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

        var reached = _navigation.Destinations[citizen.CurrentNode];
        if (reached.BuildingId is { } building && _openBuildings.Contains(building))
        {
            citizen.WorkBuildingId = building;
            citizen.CurrentActivity = reached.Activity;
            citizen.IdleSeconds = 4f + NextInt(60) / 10f;
            return;
        }

        if (_navigation.Destinations[citizen.CurrentNode].IsExit)
        {
            // A physical departure through the gate/road, not random despawning in the plaza.
            citizen.LastExitId = _navigation.Destinations[citizen.CurrentNode].Id;
            citizen.DepartureCount++;
            citizen.IsPresent = false;
            citizen.IsReturning = false;
            citizen.AwaySeconds = 4f + NextInt(101) / 10f;
            return;
        }

        citizen.WorkBuildingId = null;
        citizen.CurrentActivity = null;
        citizen.IdleSeconds = .5f + NextInt(22) / 10f;
    }

    private bool HasNeighbourAt(TownCitizen citizen, TownPoint point)
    {
        foreach (var other in _citizens)
        {
            if (other == citizen || !other.IsPresent) continue;
            var dx = other.Position.X - point.X;
            var dy = other.Position.Y - point.Y;
            if (dx * dx + dy * dy < 20f * 20f) return true;
        }
        return false;
    }

    private bool TrySidestep(TownCitizen citizen, float dx, float dy, float distance, float step)
    {
        if (distance <= .0001f || step <= 0f) return false;

        // Opposing walkers each move to their own right, naturally creating two lanes.
        // Keep the chosen side for this encounter so narrow paving does not cause jitter.
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var side = attempt == 0 ? citizen.AvoidanceSide : -citizen.AvoidanceSide;
            var candidate = new TownPoint(
                citizen.Position.X - dy / distance * step * side,
                citizen.Position.Y + dx / distance * step * side);
            if (!_navigation.IsWalkable(candidate) ||
                !_navigation.IsSegmentWalkable(citizen.Position, candidate) ||
                HasNeighbourAt(citizen, candidate))
                continue;

            citizen.Position = candidate;
            citizen.AvoidanceSide = side;
            citizen.WaitingSeconds = 0;
            if (citizen.IsReturning && Distance(candidate, citizen.EntryOrigin) >= 52f)
            {
                citizen.IsReturning = false;
                citizen.IsPresent = true;
            }
            // Preserve the original destination and cached path: next tick the actor
            // resumes forward progress instead of replanning for another pedestrian.
            return true;
        }
        return false;
    }

    private void ChooseNextStop(TownCitizen citizen)
    {
        // An initial seeded departure makes every public exit observable in playtests.
        // Subsequent trips use the same autonomous weighted decision logic for everyone.
        if (!citizen.IsReturning && citizen.DepartureCount == 0 && citizen.Id <= 4)
        {
            var firstExit = citizen.Id switch
            {
                1 => "world-gate-exit",
                2 => "west-street-exit",
                3 => "east-street-exit",
                _ => "south-street-exit"
            };
            var exitNode = _navigation.Destinations.FindIndex(destination => destination.Id == firstExit);
            if (exitNode >= 0 && TryChoose(citizen, [exitNode])) return;
        }

        var anchors = Enumerable.Range(0, _navigation.Destinations.Count)
            .Where(index => index != citizen.CurrentNode &&
                (_navigation.Destinations[index].BuildingId is null ||
                 citizen.AssignedWorkNode == index) &&
                (!citizen.IsReturning || !_navigation.Destinations[index].IsExit) &&
                !_citizens.Any(other => other != citizen &&
                    (other.DestinationNode == index ||
                     (other.IsPresent && !other.IsWalking && other.CurrentNode == index))))
            .ToArray();
        var preferred = anchors.Where(index => index != citizen.PreviousNode).ToArray();
        var candidates = preferred.Length > 0 ? preferred : anchors;

        // A minority of decisions take an authored street/gate exit.
        // Returning citizens always head back into the town instead.
        var useExit = !citizen.IsReturning && NextInt(4) == 0;
        var useWork = !useExit && !citizen.IsReturning && citizen.AssignedWorkNode >= 0 &&
            NextInt(4) != 0;
        var primary = candidates.Where(index => useWork
            ? index == citizen.AssignedWorkNode
            : _navigation.Destinations[index].IsExit == useExit &&
              _navigation.Destinations[index].BuildingId is null).ToArray();
        var secondary = candidates.Except(primary).ToArray();
        if (TryChoose(citizen, primary) || TryChoose(citizen, secondary)) return;
        citizen.IdleSeconds = .6f;
    }

    private bool TryChoose(TownCitizen citizen, int[] candidates)
    {
        if (candidates.Length == 0) return false;
        var offset = NextInt(candidates.Length);
        for (var i = 0; i < candidates.Length; i++)
        {
            var destinationNode = candidates[(i + offset) % candidates.Length];
            // Recheck reservations at commit time, including forced first exits
            // and citizens that are currently hidden while returning.
            if (_citizens.Any(other => other != citizen &&
                (other.DestinationNode == destinationNode ||
                 (other.IsPresent && !other.IsWalking && other.CurrentNode == destinationNode))))
                continue;

            var target = _navigation.Destinations[destinationNode].Position;
            if (!TryPath(citizen.Position, target, out var path)) continue;

            citizen.WorkBuildingId = null;
            citizen.CurrentActivity = null;
            citizen.DestinationNode = destinationNode;
            citizen.Path = path;
            citizen.PathIndex = 0;
            citizen.PathRevision = _navigation.Revision;
            citizen.IdleSeconds = 0;
            return true;
        }
        return false;
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
