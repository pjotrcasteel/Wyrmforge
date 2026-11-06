using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class ArenaEnvironmentState
{
    private const double CacheRadius = 32;
    /// <summary>No enemy may appear within this distance of the hunter (brief §6: never spawn on or beside the player).</summary>
    public const double MinimumSpawnDistance = 150;
    private readonly List<Supply> supplies = [];
    private readonly List<Barrier> barriers = [];
    private readonly List<DestructibleProp> destructibles = [];
    private readonly int seed;
    private readonly string biome;
    private readonly string element;
    private readonly int stage;
    private readonly string landmark;
    private readonly string district;
    private readonly string habitat;
    private readonly bool preLair;
    private readonly bool generatorPreview;
    private readonly bool worldFirstGeography;
    private readonly bool greybox;
    private readonly HuntArenaGenerator.WetForestRecipe? wetForest;
    private WorldSiteGeography? geography;
    private double? nodeInfluence;
    private ArenaTerrainGrid? terrain;
    private ArenaTerrainGrid? terrainBaseline;
    private bool[] terrainProtected = [];
    private (int Column, int Row) terrainExit;
    private (int Column, int Row)? terrainSpawn;
    private IReadOnlyList<ArenaField> terrainFields = [];

    /// <summary>The open fields along the Hunt 1.0 road: flat, rock-free ground where the field ambush can spring. Empty without terrain.</summary>
    public IReadOnlyList<ArenaField> AmbushFields => terrainFields;

    /// <summary>Where the hunter enters a Hunt 1.0 terrain arena (the south end of the road), or null for the legacy centre start.</summary>
    public Vector2D? TerrainSpawnPosition => terrainSpawn is { } spawn ? ArenaTerrainGrid.CenterOf(spawn.Column, spawn.Row) : null;
    private readonly SortedSet<long> appliedImpactIds = [];
    private (int Revision, int Column, int Row, int Radius, bool[] Cells)? reachableCache;
    private Dictionary<int, int[]>? distanceFields;
    private int distanceFieldRevision;
    private (int Column, int Row) distanceFieldCell;
    private EncounterPhase phase = EncounterPhase.Pressure;

    /// <summary>Read-only C# fixture geometry for the optional shared G5 light projection.</summary>
    public HuntArenaGenerator.WetForestRecipe? LightingRecipe => wetForest;

    private sealed class Supply(string kind, double x, double y, EncounterPhase unlockPhase)
    {
        public string Kind { get; } = kind;
        public double X { get; } = x;
        public double Y { get; } = y;
        public EncounterPhase UnlockPhase { get; } = unlockPhase;
        public bool Collected { get; set; }
        public string? DiscoveryId { get; init; }
    }

    private sealed record Barrier(double X, double Y, double Width, double Height, EncounterPhase? UnlockPhase, string Kind);

    private sealed class DestructibleProp(HuntArenaGenerator.Prop spec)
    {
        public HuntArenaGenerator.Prop Spec { get; } = spec;
        public double Health { get; set; } = spec.Health;
    }

    private ArenaEnvironmentState(int seed, string biome, string element, int stage, string landmark, string district, string habitat, bool preLair, bool generatorPreview, bool worldFirstGeography, bool greybox)
    {
        this.habitat = habitat;
        this.preLair = preLair;
        this.generatorPreview = generatorPreview;
        this.greybox = greybox;
        this.worldFirstGeography = worldFirstGeography && !greybox;
        // Preserve the first Fire Hunt's Old Road identity and combat gates,
        // but give its floor the same original source-backed woodland materials
        // as later Wet Forest encounters. Old Road Lab previews are unchanged.
        var usesForestGround = habitat == nameof(WyrmrealmHabitat.WetForest) ||
            (habitat == nameof(WyrmrealmHabitat.Outskirts) && !generatorPreview);
        wetForest = !greybox && usesForestGround ? HuntArenaGenerator.GenerateWetForest(seed) : null;
        this.seed = seed;
        this.biome = biome;
        this.element = element;
        this.stage = stage;
        this.landmark = landmark;
        this.district = district;
    }

    public static ArenaEnvironmentState Create(int mapSeed, WyrmrealmMapNode node, bool generatorPreview = false, SpellSchool? regionSchool = null, bool worldFirstGeography = false,
        IReadOnlySet<string>? claimedDiscoveries = null, bool greybox = false, bool terrain = false, double? terrainInfluence = null)
    {
        ArgumentNullException.ThrowIfNull(node);
        var stage = node.Stage;
        // Environment geometry consumes a private seeded stream, never the combat RNG.
        var seed = unchecked(mapSeed * 486187739 + stage * 73856093 + node.Lane * 19349663 +
            (generatorPreview ? (node.Site?.RoadIndex ?? 0) * 83492791 : 0));
        var random = new Random(seed);
        var biome = node.Territory?.Name ?? "River valley";
        var landmark = WyrmrealmHabitatCatalog.DisplayName(node.Habitat);
        // Region/Wyrm ecology owns environmental magic; reward attunement must never repaint the land.
        var element = regionSchool?.ToString().ToLowerInvariant() ?? (generatorPreview ? WyrmrealmHabitatCatalog.School(node.Habitat).ToString().ToLowerInvariant()
            : node.AttunementSchool?.ToString().ToLowerInvariant() ?? "arcane");
        // Each node belongs to a different local district even when its overarching biome is unchanged.
        // No combat RNG is consumed, and adjacent opening stages alternate instead of replaying one scene.
        var districtIndex = ((mapSeed & int.MaxValue) % 3 + stage + node.Lane + (node.Site?.RoadIndex ?? 0)) % 3;
        var district = new[] { "causeway", "sanctuary", "rift" }[districtIndex];
        var habitat = node.Habitat.ToString();
        var environment = new ArenaEnvironmentState(seed, biome, element, stage, landmark, district, habitat, node.PreLair, generatorPreview, worldFirstGeography, greybox)
        {
            geography = node.Geography,
            // The Arena Lab keeps its stage-based preview value; real Hunts read the node's authoritative influence.
            nodeInfluence = generatorPreview ? null : terrainInfluence ?? node.Influence,
        };
        // The one-metre greybox has no authored scenery, supplies, solid crossings or walls.
        // It keeps only the small breakable salvage props: they are the sole Charred Scrap source.
        if (node.Type != WyrmrealmNodeType.Combat) return environment;
        if (terrain && greybox)
        {
            // Hunt 1.0 terrain: the player starts at the arena centre and the exit sits at TrailExitPosition.
            var columns = (int)(ArenaMetricEnvelope.CombatWidth / ArenaTerrainGrid.CellUnits);
            var rows = (int)(ArenaMetricEnvelope.CombatHeight / ArenaTerrainGrid.CellUnits);
            // The hunter enters at the south end and the exit is at the north end: the arena is portrait, and the road runs between them.
            var recipe = ArenaTerrainGenerator.Generate(seed, terrainInfluence ?? node.Influence, columns, rows,
                (columns / 2, rows - 8), (columns / 2, (int)(Math.Max(80, ArenaMetricEnvelope.CombatHeight * .11) / ArenaTerrainGrid.CellUnits)));
            environment.terrainSpawn = recipe.Spawn;
            environment.terrainFields = recipe.Fields;
            environment.terrain = recipe.Grid;
            environment.terrainBaseline = recipe.Grid.Clone();
            environment.terrainProtected = recipe.ProtectedCells;
            environment.terrainExit = recipe.Exit;
        }

        // The old fixed gated encounter remains part of current Hunts ONLY.
        // Arena Lab previews have natural continuous ground: no synthetic cross-walls or wave checkpoints.
        if (!generatorPreview && !greybox)
        {
            // AR1 is an isolated full-run preview of graph-authored terrain; do not block
            // its mapped routes with the legacy horizontal checkpoint masonry.
            // Normal Hunts retain both physical stage gates and their existing pacing.
            if (!worldFirstGeography)
            {
                environment.AddCrossing(.315 + random.NextDouble() * .035, EncounterPhase.BreathingRoom);
                environment.AddCrossing(.675 + random.NextDouble() * .035, EncounterPhase.Surge);
            }
            environment.supplies.Add(new Supply("experience", 0.50, 0.20 + random.NextDouble() * 0.05, EncounterPhase.BreathingRoom));
            environment.supplies.Add(new Supply("health", 0.50, 0.81 + random.NextDouble() * 0.05, EncounterPhase.Surge));
        }
        var generated = HuntArenaGenerator.Generate(seed, node.Habitat, stage, node.PreLair);
        // Keep the experimental forest ecology in the lab. Only small, visible, breakable
        // salvage props enter ordinary Hunts, without changing existing crossing geometry.
        var props = generatorPreview ? generated : generated
            .Where(prop => prop.Kind is "barrel" or "crate")
            .Take(6)
            .Select(prop => prop with { DropKind = "material:CharredScrap" })
            .ToArray();
        if (!generatorPreview && props.Count == 0)
            props = [new HuntArenaGenerator.Prop(-1, "barrel", .20, .52, 12, 25, "material:CharredScrap")];
        foreach (var prop in props)
        {
            var center = new Vector2D(prop.X * 950, prop.Y * 1550);
            if (environment.IsBlocked(center, 950, 1550, prop.Radius + 4)) continue;
            // Salvage props stand on flat, walkable ground; never on a rock step, lip or fissure.
            if (environment.terrain is { } grid)
            {
                var ground = new Vector2D(prop.X * grid.Columns * ArenaTerrainGrid.CellUnits, prop.Y * grid.Rows * ArenaTerrainGrid.CellUnits);
                if (!grid.IsStandable(ground, prop.Radius + 8) || grid.SurfaceMetersAt(ground) != 0) continue;
            }
            // Existing breakable props must not block a newly authored AR2 side approach.
            if (environment.worldFirstGeography && node.Geography?.Landscape?.LocalPaths.Any(path =>
                path.EdgeId.EndsWith(":access", StringComparison.Ordinal) && path.Points.Count == 2 &&
                SegmentDistanceSquared(center, new Vector2D(path.Points[0].X * 950, path.Points[0].Y * 1550),
                    new Vector2D(path.Points[1].X * 950, path.Points[1].Y * 1550)) <
                Math.Pow(prop.Radius + 22, 2)) == true) continue;
            environment.destructibles.Add(new DestructibleProp(prop));
        }
        if (environment.worldFirstGeography && node.Geography?.Landscape is { } landscape)
        {
            foreach (var discovery in landscape.Discoveries)
            {
                if (discovery.MaterialReward is not { } material ||
                    claimedDiscoveries?.Contains(discovery.Id) == true) continue;
                environment.supplies.Add(new Supply($"material:{material}", discovery.LocalPoint.X,
                    discovery.LocalPoint.Y, EncounterPhase.Pressure) { DiscoveryId = discovery.Id });
            }
        }
        return environment;
    }

    public void SetPhase(EncounterPhase current)
    {
        // Once ground opens, backtracking must remain possible even if future logic reports an older phase.
        if (current > phase) phase = current;
    }

    /// <summary>Find a live attackable prop, independent of its visual kind. The candidate itself does not obstruct its sight line.</summary>
    public (int Id, Vector2D Position)? FindTargetableProp(Vector2D origin, double width, double height, double range,
        int? requestedId = null, Func<Vector2D, bool>? isVisible = null)
    {
        (int Id, Vector2D Position)? best = null;
        var bestDistance = double.PositiveInfinity;
        foreach (var prop in destructibles)
        {
            if (prop.Health <= 0 || (requestedId is not null && prop.Spec.Id != requestedId)) continue;
            var position = new Vector2D(prop.Spec.X * width, prop.Spec.Y * height);
            var distance = Vector2D.Distance(origin, position);
            if (distance > range || distance > bestDistance || isVisible?.Invoke(position) == false ||
                BlocksSegment(origin, position, width, height, ignoredPropId: prop.Spec.Id)) continue;
            if (best is null || distance < bestDistance || prop.Spec.Id < best.Value.Id)
            {
                best = (prop.Spec.Id, position);
                bestDistance = distance;
            }
        }
        return best;
    }

    public ArenaEnvironmentRenderSnapshot Snapshot()
    {
        // Bake the AR3 display lattice only for the explicit world-first preview.
        // Normal Hunts never serialize it; movement samples the same C# field directly.
        if (worldFirstGeography && geography?.Landscape is { Elevation: null } landscape)
            geography = geography with { Landscape = landscape with
            {
                Elevation = WorldSiteElevationField.CreatePreview(geography),
            } };

        return new(seed, biome, element, stage, landmark,
        supplies.Where(supply => !supply.Collected)
            .Select(supply => new ArenaSupplyRenderSnapshot(supply.Kind, supply.X, supply.Y, IsOpen(supply))
            { DiscoveryId = supply.DiscoveryId })
            .ToArray(),
        barriers.Select(barrier => new ArenaBarrierRenderSnapshot(barrier.X, barrier.Y, barrier.Width, barrier.Height,
            IsOpen(barrier), barrier.Kind)).ToArray(), district, habitat)
    {
        Corruption = nodeInfluence ?? HuntArenaGenerator.WyrmInfluence(stage, generatorPreview && preLair),
        GeneratorPreview = generatorPreview,
        Greybox = greybox ? new ArenaGreyboxGridRenderSnapshot(1, 32, 8, 0, 1) : null,
        Terrain = terrain is null ? null : new ArenaTerrainRenderSnapshot(terrain.Columns, terrain.Rows, terrain.Revision),
        WetForest = wetForest,
        // The normal Hunt needs AR0 site identity and port topology, not dozens of
        // inactive geometry vertices serialized on every mobile render frame.
        Geography = worldFirstGeography ? geography : geography is null ? null : geography with { Landscape = null },
        GeographyActive = worldFirstGeography,
        Props = destructibles.Where(prop => prop.Health > 0)
            .Select(prop => new ArenaPropRenderSnapshot(prop.Spec.Id, prop.Spec.Kind, prop.Spec.X, prop.Spec.Y, prop.Spec.Radius,
                prop.Health / prop.Spec.Health)).ToArray(),
    };
    }

    public Vector2D RestrictMovement(Vector2D previous, Vector2D proposed, double width, double height, double radius = 0)
    {
        var resolved = RestrictMovementOnObstacles(previous, proposed, width, height, radius);
        return TerrainActive(width, height) ? terrain!.RestrictMovement(previous, resolved, radius) : resolved;
    }

    /// <summary>Terrain applies only in the fixed metric arena it was generated for.</summary>
    private bool TerrainActive(double width, double height) => terrain is not null &&
        Math.Abs(width - terrain.Columns * ArenaTerrainGrid.CellUnits) < 1 && Math.Abs(height - terrain.Rows * ArenaTerrainGrid.CellUnits) < 1;

    public ArenaTerrainGrid? Terrain => terrain;

    /// <summary>Ground height in metres under a point, or null when this arena has no active terrain.</summary>
    public double? GroundMetersAt(Vector2D position, double width, double height) =>
        TerrainActive(width, height) ? terrain!.SurfaceMetersAt(position) : null;

    /// <summary>
    /// Apply one confirmed impact exactly once. A change that would cut the hunter off from the exit is undone,
    /// so excavation can never trap the player. Returns the columns that changed.
    /// </summary>
    public IReadOnlyList<ArenaTerrainChange> ApplyTerrainImpact(ArenaTerrainImpact impact, Vector2D hunter, double hunterRadius,
        double width, double height)
    {
        if (!TerrainActive(width, height) || !appliedImpactIds.Add(impact.Id)) return [];
        var changes = ArenaTerrainMutation.Apply(terrain!, impact, terrainProtected);
        if (changes.Count == 0) return changes;
        var hunterCell = ArenaTerrainGrid.ColumnOf(hunter);
        if (!terrain!.IsReachable(hunterCell, terrainExit, hunterRadius))
        {
            ArenaTerrainMutation.Revert(terrain, changes);
            // Already cut off before this impact (it cannot have caused it): keep the damage.
            if (!terrain.IsReachable(hunterCell, terrainExit, hunterRadius)) return ArenaTerrainMutation.Apply(terrain, impact, terrainProtected);
            return [];
        }
        return changes;
    }

    public ArenaTerrainRecord? CaptureTerrainRecord(string siteKey) => terrain is null || terrainBaseline is null ? null
        : ArenaTerrainRecord.Capture(siteKey, terrainBaseline, terrain, appliedImpactIds);

    public void RestoreTerrainRecord(string siteKey, ArenaTerrainRecord record)
    {
        if (terrain is null) throw new InvalidOperationException("This arena has no terrain.");
        record.Restore(siteKey, terrain);
        foreach (var id in record.AppliedImpactIds) appliedImpactIds.Add(id);
    }

    // One walking-cost field per radius, rebuilt only when the hunter changes column or the terrain changes.
    private Vector2D? TerrainWaypoint(Vector2D enemy, Vector2D hunter, double radius)
    {
        var grid = terrain!;
        if (!grid.BlocksMovement(enemy, hunter, radius)) return null;
        var hunterCell = ArenaTerrainGrid.ColumnOf(hunter);
        if (distanceFields is null || distanceFieldRevision != grid.Revision || distanceFieldCell != hunterCell)
        {
            distanceFields = [];
            distanceFieldRevision = grid.Revision;
            distanceFieldCell = hunterCell;
        }
        var key = (int)Math.Ceiling(radius);
        if (!distanceFields.TryGetValue(key, out var field))
            distanceFields[key] = field = grid.DistanceFrom(hunterCell, key);
        return grid.NextWaypoint(field, enemy, radius, 4);
    }

    // One breadth-first fill per hunter column and terrain revision, shared by every spawn in that window.
    private bool IsReachableFrom(Vector2D hunter, Vector2D candidate, double radius)
    {
        var grid = terrain!;
        var (hunterColumn, hunterRow) = ArenaTerrainGrid.ColumnOf(hunter);
        var key = (int)Math.Ceiling(radius);
        if (reachableCache is not { } cache || cache.Revision != grid.Revision || cache.Column != hunterColumn ||
            cache.Row != hunterRow || cache.Radius != key)
        {
            cache = (grid.Revision, hunterColumn, hunterRow, key, grid.ReachableFrom((hunterColumn, hunterRow), key));
            reachableCache = cache;
        }
        var (column, row) = ArenaTerrainGrid.ColumnOf(candidate);
        return grid.Contains(column, row) && cache.Cells[row * grid.Columns + column];
    }

    private Vector2D RestrictMovementOnObstacles(Vector2D previous, Vector2D proposed, double width, double height, double radius)
    {
        if (!IsBlocked(proposed, width, height, radius) &&
            !(worldFirstGeography && geography is not null &&
              WorldSiteElevationField.BlocksTraversal(geography, previous, proposed, width, height)))
            return proposed;
        // Resolve independently along each axis so the hunter can slide along masonry toward a gap.
        var horizontal = new Vector2D(proposed.X, previous.Y);
        if (IsBlocked(horizontal, width, height, radius) ||
            (worldFirstGeography && geography is not null &&
             WorldSiteElevationField.BlocksTraversal(geography, previous, horizontal, width, height)))
            horizontal = previous;
        var vertical = new Vector2D(horizontal.X, proposed.Y);
        return IsBlocked(vertical, width, height, radius) ||
            (worldFirstGeography && geography is not null &&
             WorldSiteElevationField.BlocksTraversal(geography, horizontal, vertical, width, height))
            ? horizontal : vertical;
    }

    /// <summary>Acquisition and projectile physics share the actual closed obstacles.</summary>
    public bool HasLineOfSight(Vector2D from, Vector2D to, double width, double height) =>
        !BlocksSegment(from, to, width, height);

    /// <summary>Continuous swept-circle collision; thin barriers cannot be skipped by a fast projectile.</summary>
    public bool BlocksSegment(Vector2D from, Vector2D to, double width, double height, double radius = 0, int? ignoredPropId = null)
    {
        if (width <= 0 || height <= 0) return false;
        // Shots and sight pass over pits and low steps but not over rock rising above 1.25 m.
        if (TerrainActive(width, height) && terrain!.BlocksSight(from, to)) return true;
        if (worldFirstGeography && WorldSiteFootprintCollision.BlocksSegment(geography?.Landscape, from, to, width, height, radius))
            return true;
        foreach (var barrier in barriers)
        {
            if (IsOpen(barrier)) continue;
            var minX = barrier.X * width;
            var maxX = (barrier.X + barrier.Width) * width;
            var minY = barrier.Y * height;
            var maxY = (barrier.Y + barrier.Height) * height;
            // Two side strips and four rounded corners are the exact rectangle/circle
            // Minkowski sum, matching IsBlocked rather than inflating square corners.
            if (IntersectsRectangle(from, to, minX - radius, maxX + radius, minY, maxY) ||
                IntersectsRectangle(from, to, minX, maxX, minY - radius, maxY + radius)) return true;
            if (radius > 0 &&
                (SegmentDistanceSquared(new Vector2D(minX, minY), from, to) <= radius * radius ||
                 SegmentDistanceSquared(new Vector2D(minX, maxY), from, to) <= radius * radius ||
                 SegmentDistanceSquared(new Vector2D(maxX, minY), from, to) <= radius * radius ||
                 SegmentDistanceSquared(new Vector2D(maxX, maxY), from, to) <= radius * radius)) return true;
        }
        foreach (var prop in destructibles)
        {
            if (prop.Health <= 0 || prop.Spec.Id == ignoredPropId) continue;
            var footprint = new Vector2D(prop.Spec.X * width, prop.Spec.Y * height);
            var combinedRadius = prop.Spec.Radius + radius;
            if (SegmentDistanceSquared(footprint, from, to) <= combinedRadius * combinedRadius) return true;
        }
        foreach (var supply in supplies)
        {
            if (supply.Collected || IsOpen(supply)) continue;
            var combinedRadius = CacheRadius + radius;
            if (SegmentDistanceSquared(new Vector2D(supply.X * width, supply.Y * height), from, to) <= combinedRadius * combinedRadius) return true;
        }
        return false;
    }

    public bool TryProjectileCollision(Vector2D from, Vector2D to, double width, double height, double radius, out Vector2D contact)
    {
        contact = to;
        if (!BlocksSegment(from, to, width, height, radius)) return false;
        // Only actual impacts pay for locating the first contact. The segment predicate
        // is monotonic as its endpoint advances, even when several walls lie on the ray.
        var low = 0d;
        var high = 1d;
        for (var iteration = 0; iteration < 16; iteration++)
        {
            var middle = (low + high) / 2;
            if (BlocksSegment(from, from + (to - from) * middle, width, height, radius)) high = middle;
            else low = middle;
        }
        contact = from + (to - from) * high;
        return true;
    }

    private static double SegmentDistanceSquared(Vector2D point, Vector2D from, Vector2D to)
    {
        var direction = to - from;
        var lengthSquared = direction.X * direction.X + direction.Y * direction.Y;
        var offset = point - from;
        var t = lengthSquared <= 1e-12 ? 0 : Math.Clamp((offset.X * direction.X + offset.Y * direction.Y) / lengthSquared, 0, 1);
        var distance = point - (from + direction * t);
        return distance.X * distance.X + distance.Y * distance.Y;
    }

    private static bool IntersectsRectangle(Vector2D from, Vector2D to, double minX, double maxX, double minY, double maxY)
    {
        var enter = 0d;
        var leave = 1d;
        return Clip(from.X, to.X - from.X, minX, maxX, ref enter, ref leave) &&
            Clip(from.Y, to.Y - from.Y, minY, maxY, ref enter, ref leave);
    }

    private static bool Clip(double origin, double delta, double min, double max, ref double enter, ref double leave)
    {
        if (Math.Abs(delta) < 1e-9) return origin >= min && origin <= max;
        var a = (min - origin) / delta;
        var b = (max - origin) / delta;
        enter = Math.Max(enter, Math.Min(a, b));
        leave = Math.Min(leave, Math.Max(a, b));
        return enter <= leave;
    }

    public bool IsBlocked(Vector2D position, double width, double height, double radius = 0)
    {
        if (TerrainActive(width, height) && !terrain!.IsStandable(position, radius)) return true;
        if (worldFirstGeography && geography is not null && width > 0 && height > 0 &&
            !WorldSiteElevationField.IsWalkable(geography, new HuntPoint(position.X / width, position.Y / height)))
            return true;
        if (worldFirstGeography && geography?.Landscape is { } landscape &&
            landscape.Obstacles.Any(obstacle => WorldSiteFootprintCollision.Contains(obstacle, position, width, height, radius)))
            return true;
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
        foreach (var prop in destructibles)
            if (prop.Health > 0 && Vector2D.Distance(position, new Vector2D(prop.Spec.X * width, prop.Spec.Y * height)) <
                radius + prop.Spec.Radius) return true;
        return false;
    }

    /// <summary>
    /// Returns a reachable spawn point at least <see cref="MinimumSpawnDistance"/> from the hunter, or null when none exists.
    /// The search is a deterministic ring walk around the request, so it consumes no randomness.
    /// </summary>
    public Vector2D? AdjustSpawnPosition(Vector2D requested, Vector2D hunter, double width, double height, double radius)
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
        if (maxY < minY) return null;
        var minX = radius + 8;
        var maxX = Math.Max(minX, width - radius - 8);
        var origin = new Vector2D(Math.Clamp(requested.X, minX, maxX), Math.Clamp(requested.Y, minY, maxY));
        const int Rings = 10;
        const int Spokes = 12;
        for (var ring = 0; ring <= Rings; ring++)
        {
            var reach = ring * 36d;
            for (var spoke = 0; spoke < (ring == 0 ? 1 : Spokes); spoke++)
            {
                var angle = spoke * Math.PI * 2 / Spokes;
                var candidate = new Vector2D(origin.X + Math.Cos(angle) * reach, origin.Y + Math.Sin(angle) * reach);
                if (candidate.X < minX || candidate.X > maxX || candidate.Y < minY || candidate.Y > maxY) continue;
                if (Vector2D.Distance(candidate, hunter) < MinimumSpawnDistance + radius) continue;
                if (IsBlocked(candidate, width, height, radius)) continue;
                // Spawn only where the hunter can be reached on foot, so a clear-all objective stays possible.
                if (TerrainActive(width, height) && !IsReachableFrom(hunter, candidate, radius)) continue;
                // New cliffs and rooted forest masses are authoritative C# colliders.
                // Don't materialize an enemy behind one without a navigable route.
                // This preview safety rule does not alter the existing normal Hunt.
                if (worldFirstGeography && BlocksSegment(candidate, hunter, width, height, radius)) continue;
                return candidate;
            }
        }
        return null;
    }

    public Vector2D EnemyNavigationTarget(Vector2D enemy, Vector2D hunter, double width, double height, double radius)
    {
        // Rock steps and pits are real terrain: route around them with the walking-cost field to the hunter.
        if (TerrainActive(width, height) && TerrainWaypoint(enemy, hunter, radius) is { } waypoint)
            return AvoidDestructible(enemy, waypoint, width, height, radius);
        // Cross the ruined choke at its known center rather than pursuing straight into the solid wing.
        // Only crossings already opened by the encounter director may be navigated.
        foreach (var gate in barriers.Where(barrier => barrier.Kind == "gate" && IsOpen(barrier)))
        {
            var crossingY = (gate.Y + gate.Height * .5) * height;
            if ((enemy.Y - crossingY) * (hunter.Y - crossingY) >= 0) continue;
            // A thicker regional crossing needs a waypoint *beyond* its masonry.
            // Otherwise a pursuing enemy targets the interior of a wide ruined gate.
            var offset = Math.Max(24, gate.Height * height * .5 + radius + 8);
            return new Vector2D(width * .5, crossingY + (hunter.Y < crossingY ? -offset : offset));
        }
        return AvoidWorldSiteObstacle(enemy, AvoidDestructible(enemy, hunter, width, height, radius), width, height, radius);
    }

    // Extend the EXISTING C# navigation policy with the same physical polygons used for
    // collision, rather than starting a competing terrain pathfinding/physics engine.
    private Vector2D AvoidWorldSiteObstacle(Vector2D enemy, Vector2D destination, double width, double height, double radius)
    {
        if (!worldFirstGeography || geography?.Landscape is not { } landscape ||
            !WorldSiteFootprintCollision.BlocksSegment(landscape, enemy, destination, width, height, radius))
            return destination;

        var best = destination;
        var bestLength = double.PositiveInfinity;
        foreach (var obstacle in landscape.Obstacles)
        {
            if (obstacle.Outline.Count < 3) continue;
            var centerX = obstacle.Outline.Average(point => point.X) * width;
            var centerY = obstacle.Outline.Average(point => point.Y) * height;
            foreach (var vertex in obstacle.Outline)
            {
                var point = new Vector2D(vertex.X * width, vertex.Y * height);
                var delta = point - new Vector2D(centerX, centerY);
                var length = Math.Sqrt(delta.X * delta.X + delta.Y * delta.Y);
                if (length < 1e-6) continue;
                var clearance = radius + 16;
                var waypoint = point + delta * (clearance / length);
                if (waypoint.X <= radius || waypoint.Y <= radius ||
                    waypoint.X >= width - radius || waypoint.Y >= height - radius ||
                    IsBlocked(waypoint, width, height, radius) ||
                    BlocksSegment(enemy, waypoint, width, height, radius)) continue;
                var score = Vector2D.Distance(enemy, waypoint) + Vector2D.Distance(waypoint, destination);
                if (score >= bestLength) continue;
                bestLength = score;
                best = waypoint;
            }
        }
        return best;
    }

    /// <summary>
    /// A deterministic local detour around the first solid prop on the path.
    /// Navigation stays in world space and does not use the combat RNG. Closed
    /// encounter crossings still have priority over local obstacle steering.
    /// </summary>
    private Vector2D AvoidDestructible(Vector2D enemy, Vector2D goal, double width, double height, double radius)
    {
        DestructibleProp? obstacle = null;
        var nearest = double.PositiveInfinity;
        var travel = goal - enemy;
        var squaredLength = travel.X * travel.X + travel.Y * travel.Y;
        if (squaredLength < 1) return goal;

        foreach (var prop in destructibles)
        {
            if (prop.Health <= 0) continue;
            var center = new Vector2D(prop.Spec.X * width, prop.Spec.Y * height);
            var offset = center - enemy;
            var progress = (offset.X * travel.X + offset.Y * travel.Y) / squaredLength;
            if (progress <= 0 || progress >= 1 || progress >= nearest) continue;
            var clearance = prop.Spec.Radius + radius + 2;
            if (SegmentDistanceSquared(center, enemy, goal) >= clearance * clearance) continue;
            nearest = progress;
            obstacle = prop;
        }
        if (obstacle is null) return goal;

        var position = new Vector2D(obstacle.Spec.X * width, obstacle.Spec.Y * height);
        var towards = Vector2D.DirectionTo(enemy, goal);
        var across = new Vector2D(-towards.Y, towards.X);
        var distance = obstacle.Spec.Radius + radius + 12;
        // Aim beyond the prop, not at its center. A clear exit tangent is preferable
        // to a blocked shorter detour. Use stable tie breaking for replay fidelity.
        var best = goal;
        var cost = double.PositiveInfinity;
        foreach (var side in new[] { -1d, 1d })
        {
            var waypoint = position + towards * (distance * .55) + across * (side * distance * 1.7);
            if (waypoint.X < radius || waypoint.Y < radius || waypoint.X > width - radius || waypoint.Y > height - radius) continue;
            if (IsBlocked(waypoint, width, height, radius) || BlocksSegment(enemy, waypoint, width, height, radius)) continue;
            // A detour that must cross a rock step is no detour: the terrain field routes around the prop instead.
            if (TerrainActive(width, height) && terrain!.BlocksMovement(enemy, waypoint, radius)) continue;
            var score = Vector2D.Distance(enemy, waypoint) + Vector2D.Distance(waypoint, goal);
            if (score >= cost) continue;
            best = waypoint;
            cost = score;
        }
        return best == goal ? goal : best;
    }

    /// <summary>Earned enemy loot exists in the world until collected; no combat RNG is consumed.</summary>
    public void SpawnMaterialPickup(Vector2D position, double width, double height, string material)
    {
        if (width <= 0 || height <= 0 || !Enum.TryParse<Wyrmforge.Domain.Progression.Signature.HuntMaterialId>(material, out var id)
            || !Enum.IsDefined(id) || id.ToString() != material) return;
        supplies.Add(new Supply($"material:{material}", Math.Clamp(position.X / width, .015, .985),
            Math.Clamp(position.Y / height, .015, .985), EncounterPhase.Pressure));
    }

    public ArenaSupplyRenderSnapshot? TryCollect(Vector2D position, double width, double height, double playerRadius, bool needsHealing)
    {
        foreach (var supply in supplies)
        {
            if (supply.Collected || !IsOpen(supply) || (supply.Kind == "health" && !needsHealing)) continue;
            var center = new Vector2D(supply.X * width, supply.Y * height);
            if (Vector2D.Distance(position, center) > playerRadius + 16) continue;
            supply.Collected = true;
            return new ArenaSupplyRenderSnapshot(supply.Kind, supply.X, supply.Y, true)
            { DiscoveryId = supply.DiscoveryId };
        }
        return null;
    }

    /// <summary>A real projectile impact breaks a physical prop, revealing an existing pickup type at its location.</summary>
    public bool TryDamageProp(Vector2D contact, double width, double height, double projectileRadius, double damage)
    {
        if (damage <= 0) return false;
        foreach (var prop in destructibles)
        {
            if (prop.Health <= 0) continue;
            var position = new Vector2D(prop.Spec.X * width, prop.Spec.Y * height);
            if (Vector2D.Distance(contact, position) > prop.Spec.Radius + projectileRadius + 2) continue;
            prop.Health -= damage;
            if (prop.Health <= 0 && prop.Spec.DropKind is { } kind)
                supplies.Add(new Supply(kind, prop.Spec.X, prop.Spec.Y, EncounterPhase.Pressure));
            return true;
        }
        return false;
    }

    /// <summary>Apply a real area hit to physical props once per explosion, never through a sealed crossing.</summary>
    public int DamagePropsInRadius(Vector2D center, double width, double height, double radius, double damage)
    {
        if (radius <= 0 || damage <= 0) return 0;
        var hit = 0;
        foreach (var prop in destructibles)
        {
            if (prop.Health <= 0) continue;
            var position = new Vector2D(prop.Spec.X * width, prop.Spec.Y * height);
            if (Vector2D.Distance(center, position) > radius + prop.Spec.Radius) continue;
            if (barriers.Any(barrier => !IsOpen(barrier) &&
                SegmentIntersectsBarrier(center, position, barrier, width, height))) continue;
            prop.Health -= damage;
            if (prop.Health <= 0 && prop.Spec.DropKind is { } kind)
                supplies.Add(new Supply(kind, prop.Spec.X, prop.Spec.Y, EncounterPhase.Pressure));
            hit++;
        }
        return hit;
    }

    private static bool SegmentIntersectsBarrier(Vector2D start, Vector2D end, Barrier barrier, double width, double height) =>
        IntersectsRectangle(start, end, barrier.X * width, (barrier.X + barrier.Width) * width,
            barrier.Y * height, (barrier.Y + barrier.Height) * height);

    private void AddCrossing(double y, EncounterPhase unlockPhase)
    {
        // A deliberately narrow 18% pass connects visually distinct regions in a wide world.
        // A small gap between segments is avoided: no invisible corner a hunter can squeeze through.
        // Local districts change the *physical* throat width and the character of their fortifications.
        // Sanctuary courtyards have grand wide entrances; the fractured pass is heavy and constricted.
        var opening = district switch { "sanctuary" => .30, "rift" => .20, _ => .24 };
        var thickness = district switch { "sanctuary" => .018, "rift" => .04, _ => .026 };
        var leftWidth = (1 - opening) / 2;
        barriers.Add(new Barrier(0, y, leftWidth, thickness, null, "ruin"));
        barriers.Add(new Barrier(leftWidth + opening, y, leftWidth, thickness, null, "ruin"));
        barriers.Add(new Barrier(leftWidth, y, opening, thickness, unlockPhase, "gate"));
    }

    private bool IsOpen(Supply supply) => phase >= supply.UnlockPhase;
    private bool IsOpen(Barrier barrier) => barrier.UnlockPhase is { } unlock && phase >= unlock;
}
