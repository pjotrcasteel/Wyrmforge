using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class ArenaEnvironmentState
{
    private const double CacheRadius = 32;
    private readonly List<Supply> supplies = [];
    private readonly List<Barrier> barriers = [];
    private readonly int seed;
    private readonly string biome;
    private readonly string element;
    private readonly int stage;
    private readonly string landmark;
    private readonly string district;
    private EncounterPhase phase = EncounterPhase.Pressure;

    private sealed class Supply(string kind, double x, double y, EncounterPhase unlockPhase)
    {
        public string Kind { get; } = kind;
        public double X { get; } = x;
        public double Y { get; } = y;
        public EncounterPhase UnlockPhase { get; } = unlockPhase;
        public bool Collected { get; set; }
    }

    private sealed record Barrier(double X, double Y, double Width, double Height, EncounterPhase? UnlockPhase, string Kind);

    private ArenaEnvironmentState(int seed, string biome, string element, int stage, string landmark, string district)
    {
        this.seed = seed;
        this.biome = biome;
        this.element = element;
        this.stage = stage;
        this.landmark = landmark;
        this.district = district;
    }

    public static ArenaEnvironmentState Create(int mapSeed, WyrmrealmMapNode node)
    {
        ArgumentNullException.ThrowIfNull(node);
        var stage = node.Stage;
        // Environment geometry consumes a private seeded stream, never the combat RNG.
        var seed = unchecked(mapSeed * 486187739 + stage * 73856093 + node.Lane * 19349663);
        var random = new Random(seed);
        var biome = node.Territory?.Name ?? "River valley";
        var landmark = biome switch
        {
            "Ashen caldera" => stage >= 6 ? "The dragon's scorched approach" : "Abandoned ashfall outpost",
            "Broken ridge" => stage >= 6 ? "Collapsed guardian watch" : "Old pilgrim stones",
            _ => stage >= 6 ? "The ruined river crossing" : "Forgotten hunter's trail",
        };
        var element = node.AttunementSchool?.ToString().ToLowerInvariant() ?? "arcane";
        // Each node belongs to a different local district even when its overarching biome is unchanged.
        // No combat RNG is consumed, and adjacent opening stages alternate instead of replaying one scene.
        var districtIndex = ((seed & int.MaxValue) % 3 + stage + node.Lane + (node.Site?.RoadIndex ?? 0)) % 3;
        var district = new[] { "causeway", "sanctuary", "rift" }[districtIndex];
        var environment = new ArenaEnvironmentState(seed, biome, element, stage, landmark, district);
        if (node.Type != WyrmrealmNodeType.Combat) return environment;

        // The hunter begins in the central courtyard. Both crossings have a permanent narrow throat.
        // A sealed barricade temporarily closes that throat. The north opens after wave two;
        // the south opens at the surge. Neither gate can lock again during this encounter.
        environment.AddCrossing(.315 + random.NextDouble() * .035, EncounterPhase.BreathingRoom);
        environment.AddCrossing(.675 + random.NextDouble() * .035, EncounterPhase.Surge);
        environment.supplies.Add(new Supply("experience", 0.50, 0.20 + random.NextDouble() * 0.05, EncounterPhase.BreathingRoom));
        environment.supplies.Add(new Supply("health", 0.50, 0.81 + random.NextDouble() * 0.05, EncounterPhase.Surge));
        return environment;
    }

    public void SetPhase(EncounterPhase current)
    {
        // Once ground opens, backtracking must remain possible even if future logic reports an older phase.
        if (current > phase) phase = current;
    }

    public ArenaEnvironmentRenderSnapshot Snapshot() => new(seed, biome, element, stage, landmark,
        supplies.Where(supply => !supply.Collected)
            .Select(supply => new ArenaSupplyRenderSnapshot(supply.Kind, supply.X, supply.Y, IsOpen(supply)))
            .ToArray(),
        barriers.Select(barrier => new ArenaBarrierRenderSnapshot(barrier.X, barrier.Y, barrier.Width, barrier.Height,
            IsOpen(barrier), barrier.Kind)).ToArray(), district);

    public Vector2D RestrictMovement(Vector2D previous, Vector2D proposed, double width, double height, double radius = 0)
    {
        if (!IsBlocked(proposed, width, height, radius)) return proposed;
        // Resolve independently along each axis so the hunter can slide along masonry toward a gap.
        var horizontal = new Vector2D(proposed.X, previous.Y);
        if (IsBlocked(horizontal, width, height, radius)) horizontal = previous;
        var vertical = new Vector2D(horizontal.X, proposed.Y);
        return IsBlocked(vertical, width, height, radius) ? horizontal : vertical;
    }

    public bool IsBlocked(Vector2D position, double width, double height, double radius = 0)
    {
        foreach (var barrier in barriers)
        {
            if (IsOpen(barrier)) continue;
            var minX = barrier.X * width;
            var maxX = (barrier.X + barrier.Width) * width;
            var minY = barrier.Y * height;
            var maxY = (barrier.Y + barrier.Height) * height;
            var nearestX = Math.Clamp(position.X, minX, maxX);
            var nearestY = Math.Clamp(position.Y, minY, maxY);
            var dx = position.X - nearestX;
            var dy = position.Y - nearestY;
            if (dx * dx + dy * dy < Math.Max(radius * radius, 0.0001)) return true;
        }
        foreach (var supply in supplies)
        {
            if (supply.Collected || IsOpen(supply)) continue;
            if (Vector2D.Distance(position, new Vector2D(supply.X * width, supply.Y * height)) < radius + CacheRadius) return true;
        }
        return false;
    }

    public Vector2D AdjustSpawnPosition(Vector2D requested, Vector2D hunter, double width, double height, double radius)
    {
        // Monsters may not spawn behind an unopened crossing, which would make a clear-all objective impossible.
        var minY = radius + 8;
        var maxY = height - radius - 8;
        foreach (var barrier in barriers.Where(barrier => barrier.Kind == "gate" && !IsOpen(barrier)))
        {
            var top = barrier.Y * height;
            var bottom = (barrier.Y + barrier.Height) * height;
            if (hunter.Y >= bottom) minY = Math.Max(minY, bottom + radius + 8);
            else if (hunter.Y <= top) maxY = Math.Min(maxY, top - radius - 8);
        }
        if (maxY < minY) return hunter;
        var candidate = new Vector2D(Math.Clamp(requested.X, radius + 8, width - radius - 8),
            Math.Clamp(requested.Y, minY, maxY));
        return IsBlocked(candidate, width, height, radius) ? hunter : candidate;
    }

    public Vector2D EnemyNavigationTarget(Vector2D enemy, Vector2D hunter, double width, double height, double radius)
    {
        // Cross the ruined choke at its known center rather than pursuing straight into the solid wing.
        // Only crossings already opened by the encounter director may be navigated.
        foreach (var gate in barriers.Where(barrier => barrier.Kind == "gate" && IsOpen(barrier)))
        {
            var crossingY = (gate.Y + gate.Height * .5) * height;
            if ((enemy.Y - crossingY) * (hunter.Y - crossingY) >= 0) continue;
            var offset = Math.Max(24, radius + 12);
            return new Vector2D(width * .5, crossingY + (hunter.Y < crossingY ? -offset : offset));
        }
        return hunter;
    }

    public ArenaSupplyRenderSnapshot? TryCollect(Vector2D position, double width, double height, double playerRadius, bool needsHealing)
    {
        foreach (var supply in supplies)
        {
            if (supply.Collected || !IsOpen(supply) || (supply.Kind == "health" && !needsHealing)) continue;
            var center = new Vector2D(supply.X * width, supply.Y * height);
            if (Vector2D.Distance(position, center) > playerRadius + 16) continue;
            supply.Collected = true;
            return new ArenaSupplyRenderSnapshot(supply.Kind, supply.X, supply.Y, true);
        }
        return null;
    }

    private void AddCrossing(double y, EncounterPhase unlockPhase)
    {
        // A deliberately narrow 18% pass connects visually distinct regions in a wide world.
        // A small gap between segments is avoided: no invisible corner a hunter can squeeze through.
        barriers.Add(new Barrier(0, y, .41, .024, null, "ruin"));
        barriers.Add(new Barrier(.59, y, .41, .024, null, "ruin"));
        barriers.Add(new Barrier(.41, y, .18, .024, unlockPhase, "gate"));
    }

    private bool IsOpen(Supply supply) => phase >= supply.UnlockPhase;
    private bool IsOpen(Barrier barrier) => barrier.UnlockPhase is { } unlock && phase >= unlock;
}
