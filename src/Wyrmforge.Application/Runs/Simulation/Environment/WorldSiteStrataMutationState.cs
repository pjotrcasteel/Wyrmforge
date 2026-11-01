using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>Authoritative C# mutation states for a physical world cell, independent of sprite frames.</summary>
public enum WorldSiteCellMutationKind
{
    Damaged,
    Removed,
}

/// <summary>
/// A changed block only. Absence from the sparse collection means unchanged seeded geology;
/// Removed is an explicit tombstone, not a missing key or an untextured surface.
/// </summary>
public sealed record WorldSiteCellDelta(
    WorldSiteCellKey Key,
    WorldSiteCellMutationKind Kind,
    int RemainingIntegrity,
    long Revision);

/// <summary>
/// Exactly-once terrain impact identity. Persist even for a zero-change impact so
/// a delayed duplicate cannot damage a later, newly exposed physical surface.
/// </summary>
public sealed record WorldSiteStrataAppliedImpact(string ImpactId, long RevisionAfter);

/// <summary>A physical block's sparse, immutable 12.5cm excavation mask at its last mutation.</summary>
public sealed record WorldSiteCellFracture(
    WorldSiteCellKey Key,
    WorldSiteFractureMask Mask,
    long Revision);

/// <summary>
/// C# source-of-truth contact height after excavation. The intact height uses
/// AR3's continuous ground surface, with one physical stratum removed per Z drop.
/// No walkability, actor radius, drop tolerance, or LOS policy is chosen here.
/// </summary>
public sealed record WorldSiteStrataGroundContact(
    WorldSiteCellKey Key,
    WorldSiteSurfaceId? Material,
    double FloorHeightMeters,
    bool Solid);

/// <summary>
/// The first physically occupied 12.5cm cube in a local XY microcolumn.
/// This query is for isolated C# fracture review, not a Hunt collision adapter.
/// </summary>
public sealed record WorldSiteMicrocellContact(
    WorldSiteCellKey Key,
    int LocalZ,
    WorldSiteSurfaceId? Material,
    double FloorHeightMeters,
    bool Solid);

/// <summary>
/// A versioned, seed/site/grid-scale-scoped snapshot of changes, not a serialized 3D world or JS state.
/// Schema v4 adds sparse fracture masks to v3's exactly-once impact identities.
/// Older v2/v3 saves restore without fractures and upgrade on capture.
/// </summary>
public sealed record WorldSiteStrataMutationSave(
    int Version,
    int WorldSeed,
    string SiteId,
    double CellWidthMeters,
    double StratumHeightMeters,
    int Columns,
    int Rows,
    long Revision,
    IReadOnlyList<WorldSiteCellDelta> Changes)
{
    public IReadOnlyList<WorldSiteStrataAppliedImpact> AppliedImpacts { get; init; } = [];
    public IReadOnlyList<WorldSiteCellFracture> Fractures { get; init; } = [];
}

/// <summary>
/// XYZ1 foundation: sparse, replayable damage/removal over the existing read-only AR3 geology.
/// This does not connect to Hunt collision, Fireball, navigation, rewards or save slots yet.
/// Only the existing C# simulation may eventually own such an integration.
/// </summary>
public sealed class WorldSiteStrataMutationState
{
    public const int CurrentVersion = 4;

    private readonly WorldSiteStrataGrid _baseGrid;
    private readonly Dictionary<WorldSiteCellKey, WorldSiteCellDelta> _changes = [];
    private readonly Dictionary<WorldSiteCellKey, WorldSiteCellFracture> _fractures = [];
    private readonly Dictionary<string, long> _appliedImpacts = new(StringComparer.Ordinal);
    private long _revision;

    public long Revision => _revision;
    public int ChangedCellCount => _changes.Count;
    public int FracturedCellCount => _fractures.Count;
    public int AppliedImpactCount => _appliedImpacts.Count;
    /// <summary>The immutable C# geology used by this mutation state and its render projections.</summary>
    public WorldSiteStrataGrid BaseGrid => _baseGrid;

    public WorldSiteStrataMutationState(WorldSiteStrataGrid baseGrid)
    {
        ArgumentNullException.ThrowIfNull(baseGrid);
        _baseGrid = baseGrid;
    }

    /// <summary>
    /// Return the physically remaining C# cell. When the cell above a buried block has
    /// been removed, SurfaceFinish identifies the newly exposed material for AR4 lookup.
    /// No top/side sprite is selected here.
    /// </summary>
    public WorldSiteStrataCell GetCell(WorldSiteCellKey key)
    {
        var cell = GetRawCell(key);
        if (cell.IsEmpty)
        {
            return cell;
        }

        if (key.Z < cell.SurfaceZ)
        {
            var above = GetRawCell(key with { Z = key.Z + 1 });
            if (above.IsEmpty)
            {
                return cell with { SurfaceFinish = cell.BodyMaterial };
            }
        }

        return cell;
    }

    /// <summary>
    /// Resolve the current topmost material at one XY column after contiguous block removal.
    /// The seeded top Z comes from AR3; removed blocks expose the next true physical stratum.
    /// The returned SurfaceHeightMeters still records the unchanged seeded AR3 grade;
    /// a later C# collision adapter must derive the excavated floor height explicitly.
    /// This is a semantic query, not a renderer, crater decal or collision cutover.
    /// </summary>
    public WorldSiteStrataCell GetExposedSurfaceCell(int x, int y)
    {
        var seededTop = _baseGrid.GetCell(x, y, int.MaxValue);
        if (x < 0 || y < 0 || x >= _baseGrid.Columns || y >= _baseGrid.Rows)
        {
            return seededTop;
        }

        var key = new WorldSiteCellKey(x, y, seededTop.SurfaceZ);
        // With the current contiguous, rock-backed base geology, a finite sparse set of
        // removed cells can only hide finitely many consecutive strata above solid rock.
        while (GetRawCell(key).IsEmpty)
        {
            key = key with { Z = checked(key.Z - 1) };
        }

        return GetCell(key);
    }

    /// <summary>
    /// Isolated physical contact projection for future C# movement/nav/LOS integration.
    /// Do not infer a 32-metre cube from the 32-source-pixel tile, or overwrite the
    /// seeded AR3 height when reporting the newly excavated floor.
    /// </summary>
    public WorldSiteStrataGroundContact GetGroundContact(int x, int y)
    {
        var exposed = GetExposedSurfaceCell(x, y);
        if (exposed.IsEmpty)
        {
            return new WorldSiteStrataGroundContact(exposed.Key, null, 0, false);
        }

        var removedStrata = (long)exposed.SurfaceZ - exposed.Key.Z;
        return new WorldSiteStrataGroundContact(exposed.Key, exposed.SurfaceFinish,
            exposed.SurfaceHeightMeters - removedStrata * _baseGrid.StratumHeightMeters,
            exposed.Solid);
    }

    /// <summary>Return the change, if any. Null specifically means the seeded base is unchanged.</summary>
    public WorldSiteCellDelta? FindDelta(WorldSiteCellKey key)
    {
        return _changes.TryGetValue(key, out var delta) ? delta : null;
    }

    /// <summary>Null means this physical block has no local fracture mask.</summary>
    public WorldSiteCellFracture? FindFracture(WorldSiteCellKey key) =>
        _fractures.TryGetValue(key, out var fracture) ? fracture : null;

    /// <summary>
    /// Remove precisely one previously present 12.5cm cube from an intact 1m block.
    /// Whole-block damage and partial excavation deliberately cannot co-own one block
    /// until a later single C# damage policy chooses how to combine their integrity.
    /// The immutable mask is allocated only for modified blocks; no microcell entities.
    /// </summary>
    public bool TryExcavateMicrocell(WorldSiteCellKey key, int localX, int localY, int localZ)
    {
        _ = WorldSiteFractureGeometry.Pack(localX, localY, localZ);
        EnsurePhysicalFractureScale();
        var original = _baseGrid.GetCell(key.X, key.Y, key.Z);
        if (original.IsEmpty || !original.Solid || _changes.ContainsKey(key))
        {
            return false;
        }

        var oldMask = _fractures.TryGetValue(key, out var previous)
            ? previous.Mask : default;
        if (oldMask.IsRemoved(localX, localY, localZ))
        {
            return false;
        }

        _revision = checked(_revision + 1);
        _fractures[key] = new WorldSiteCellFracture(key,
            oldMask.Remove(localX, localY, localZ), _revision);
        return true;
    }

    /// <summary>
    /// Resolve the actual per-microcolumn solid top, including a rock microcell
    /// exposed through a partially fractured soil cover. The whole-block
    /// GetGroundContact remains conservative until C# collision integration.
    /// </summary>
    public WorldSiteMicrocellContact GetMicrocellContact(int x, int y, int localX, int localY)
    {
        _ = WorldSiteFractureGeometry.Pack(localX, localY, 0);
        EnsurePhysicalFractureScale();
        var seeded = _baseGrid.GetCell(x, y, int.MaxValue);
        if (x < 0 || y < 0 || x >= _baseGrid.Columns || y >= _baseGrid.Rows)
        {
            return new WorldSiteMicrocellContact(seeded.Key, 0, null, 0, false);
        }

        var z = seeded.SurfaceZ;
        while (true)
        {
            var key = new WorldSiteCellKey(x, y, z);
            var cell = GetRawCell(key);
            if (cell.Solid)
            {
                for (var localZ = WorldSiteFractureGeometry.MicrocellsPerEdge - 1;
                    localZ >= 0; localZ--)
                {
                    if (_fractures.TryGetValue(key, out var fracture) &&
                        fracture.Mask.IsRemoved(localX, localY, localZ))
                    {
                        continue;
                    }

                    var material = z == seeded.SurfaceZ &&
                        localZ == WorldSiteFractureGeometry.MicrocellsPerEdge - 1
                            ? cell.SurfaceFinish : cell.BodyMaterial;
                    var depth = (long)seeded.SurfaceZ - z +
                        (double)(WorldSiteFractureGeometry.MicrocellsPerEdge - 1 - localZ) /
                        WorldSiteFractureGeometry.MicrocellsPerEdge;
                    return new WorldSiteMicrocellContact(key, localZ, material,
                        seeded.SurfaceHeightMeters - depth * _baseGrid.StratumHeightMeters, true);
                }
            }

            z = checked(z - 1);
        }
    }

    /// <summary>
    /// Apply one C#-authorized positive integer damage amount to one solid block.
    /// A future shared combat adapter decides material hardness, radial falloff and event identity.
    /// Integrity is passed explicitly so this proof does not invent Fireball balance values.
    /// Already removed blocks and empty/non-solid positions are never damaged twice.
    /// </summary>
    public bool TryDamageCell(WorldSiteCellKey key, int damage, int initialIntegrity)
    {
        if (damage <= 0)
        {
            return false;
        }

        if (initialIntegrity <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(initialIntegrity));
        }

        var baseCell = _baseGrid.GetCell(key.X, key.Y, key.Z);
        if (baseCell.IsEmpty || !baseCell.Solid || _fractures.ContainsKey(key))
        {
            return false;
        }

        var before = initialIntegrity;
        if (_changes.TryGetValue(key, out var previous))
        {
            if (previous.Kind == WorldSiteCellMutationKind.Removed)
            {
                return false;
            }

            before = previous.RemainingIntegrity;
        }

        var remaining = Math.Max(0, before - damage);
        _revision = checked(_revision + 1);
        _changes[key] = new WorldSiteCellDelta(key,
            remaining == 0 ? WorldSiteCellMutationKind.Removed : WorldSiteCellMutationKind.Damaged,
            remaining, _revision);
        return true;
    }

    /// <summary>
    /// XYZ2 isolated C# radial excavation proof. Exactly one exposed top cell per
    /// XY column receives a bounded, integer, squared-radius falloff. Solid covers
    /// shield buried rock in the same impact; later impacts may reach exposed rock.
    /// This has NO live Fireball, LOS/navigation, gameplay save-slot or collider
    /// integration yet. Those remain separate, gated C# responsibilities.
    /// </summary>
    public WorldSiteStrataImpactResult ApplySurfaceImpact(WorldSiteStrataImpact impact)
    {
        ArgumentNullException.ThrowIfNull(impact);
        if (string.IsNullOrWhiteSpace(impact.ImpactId) || impact.ImpactId.Length > 128)
        {
            throw new ArgumentException("An impact must have a caller-owned identity.", nameof(impact));
        }

        // Bound the area to 33x33 candidate columns, independent of seed or device.
        if (impact.RadiusCells is < 0 or > 16 || impact.PeakDamage <= 0 ||
            impact.SoilIntegrity <= 0 || impact.RockIntegrity <= 0 || impact.OtherIntegrity <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(impact));
        }


        if (_appliedImpacts.ContainsKey(impact.ImpactId))
        {
            return new WorldSiteStrataImpactResult(impact.ImpactId, impact.CenterX, impact.CenterY,
                impact.RadiusCells, _revision, _revision, []) { Duplicate = true };
        }

        var revisionBefore = _revision;
        var changes = new List<WorldSiteStrataImpactChange>();
        var radiusSquared = impact.RadiusCells * impact.RadiusCells;
        for (var dy = -impact.RadiusCells; dy <= impact.RadiusCells; dy++)
        for (var dx = -impact.RadiusCells; dx <= impact.RadiusCells; dx++)
        {
            var distanceSquared = dx * dx + dy * dy;
            if (distanceSquared > radiusSquared)
            {
                continue;
            }

            // Widen before addition so out-of-range impact centers cannot wrap.
            var x = (long)impact.CenterX + dx;
            var y = (long)impact.CenterY + dy;
            if (x < 0 || x >= _baseGrid.Columns || y < 0 || y >= _baseGrid.Rows)
            {
                continue;
            }

            var before = GetExposedSurfaceCell((int)x, (int)y);
            if (before.IsEmpty || !before.Solid || before.BodyMaterial is not { } body)
            {
                continue;
            }

            var integrity = body switch
            {
                WorldSiteSurfaceId.Soil => impact.SoilIntegrity,
                WorldSiteSurfaceId.Rock => impact.RockIntegrity,
                _ => impact.OtherIntegrity,
            };
            // All operations are integer and ordered row-major for exact replay.
            // The far edge can be hit weakly; center retains the peak strength.
            var damage = (int)Math.Max(1L, (long)impact.PeakDamage *
                (radiusSquared - distanceSquared + 1) / (radiusSquared + 1));
            if (!TryDamageCell(before.Key, damage, integrity))
            {
                continue;
            }

            var delta = FindDelta(before.Key)!;
            var exposed = GetExposedSurfaceCell((int)x, (int)y);
            changes.Add(new WorldSiteStrataImpactChange(before.Key, damage, before.SurfaceFinish,
                delta, exposed.Key, exposed.SurfaceFinish));
        }

        _appliedImpacts.Add(impact.ImpactId, _revision);
        return new WorldSiteStrataImpactResult(impact.ImpactId, impact.CenterX, impact.CenterY,
            impact.RadiusCells, revisionBefore, _revision, changes);
    }

    /// <summary>
    /// XYZ3 isolated 3D excavation proof. Bounded sphere crosses block boundaries
    /// at exact integer microcell coordinates. A rock block beneath an initially
    /// occupied top block is shielded for this entire impact, even if the blast
    /// removes soil during its own iteration. Subsequent distinct impacts can
    /// reach rock through an actually excavated local microcolumn. No Hunt hook.
    /// </summary>
    public WorldSiteFractureImpactResult ApplyFractureImpact(WorldSiteFractureImpact impact)
    {
        ArgumentNullException.ThrowIfNull(impact);
        if (string.IsNullOrWhiteSpace(impact.ImpactId) || impact.ImpactId.Length > 128)
        {
            throw new ArgumentException("A fracture impact needs a caller-owned identity.", nameof(impact));
        }

        _ = WorldSiteFractureGeometry.Pack(impact.LocalX, impact.LocalY, impact.LocalZ);
        EnsurePhysicalFractureScale();
        // At most 25^3 candidates / ~7,200 actual cubes; no unbounded explosion volume.
        if (impact.RadiusMicrocells is < 0 or > 12)
        {
            throw new ArgumentOutOfRangeException(nameof(impact));
        }

        if (_appliedImpacts.ContainsKey(impact.ImpactId))
        {
            return new WorldSiteFractureImpactResult(impact.ImpactId, _revision, _revision, [])
                { Duplicate = true };
        }

        var edge = WorldSiteFractureGeometry.MicrocellsPerEdge;
        var cx = (long)impact.Center.X * edge + impact.LocalX;
        var cy = (long)impact.Center.Y * edge + impact.LocalY;
        var cz = (long)impact.Center.Z * edge + impact.LocalZ;
        var radius = impact.RadiusMicrocells;
        var radiusSquared = radius * radius;

        // Capture the *pre-impact* top physical block per microcolumn, so this
        // blast can excavate multiple soil sublayers but cannot tunnel through
        // fresh soil holes and immediately damage protected rock in one event.
        var originalSurfaceZ = new Dictionary<(long X, long Y), int>();
        for (var dy = -radius; dy <= radius; dy++)
        for (var dx = -radius; dx <= radius; dx++)
        {
            if (dx * dx + dy * dy > radiusSquared)
            {
                continue;
            }

            var mx = cx + dx;
            var my = cy + dy;
            if (!TryUnpackGlobalMicrocell(mx, out var x, out var localX) ||
                !TryUnpackGlobalMicrocell(my, out var y, out var localY) ||
                x < 0 || y < 0 || x >= _baseGrid.Columns || y >= _baseGrid.Rows)
            {
                continue;
            }

            originalSurfaceZ[(mx, my)] = GetMicrocellContact(x, y, localX, localY).Key.Z;
        }

        var revisionBefore = _revision;
        var changes = new List<WorldSiteFractureImpactChange>();
        // Fixed Z/Y/X order is portable and independent of dictionary enumeration.
        for (var dz = radius; dz >= -radius; dz--)
        for (var dy = -radius; dy <= radius; dy++)
        for (var dx = -radius; dx <= radius; dx++)
        {
            if (dx * dx + dy * dy + dz * dz > radiusSquared)
            {
                continue;
            }

            var mx = cx + dx;
            var my = cy + dy;
            if (!originalSurfaceZ.TryGetValue((mx, my), out var uncoveredTopZ) ||
                !TryUnpackGlobalMicrocell(mx, out var x, out var localX) ||
                !TryUnpackGlobalMicrocell(my, out var y, out var localY) ||
                !TryUnpackGlobalMicrocell(cz + dz, out var z, out var localZ) ||
                z < uncoveredTopZ)
            {
                continue;
            }

            var key = new WorldSiteCellKey(x, y, z);
            var body = _baseGrid.GetCell(x, y, z).BodyMaterial;
            if (body is not { } material ||
                !TryExcavateMicrocell(key, localX, localY, localZ))
            {
                continue;
            }

            changes.Add(new WorldSiteFractureImpactChange(key, localX, localY, localZ, material));
        }

        _appliedImpacts.Add(impact.ImpactId, _revision);
        return new WorldSiteFractureImpactResult(impact.ImpactId, revisionBefore, _revision, changes);
    }

    /// <summary>Capture a stable, ordered copy of only changed cells, suitable for C# save/replay.</summary>
    public WorldSiteStrataMutationSave CaptureSave()
    {
        return new WorldSiteStrataMutationSave(CurrentVersion, _baseGrid.WorldSeed, _baseGrid.SiteId,
            _baseGrid.CellWidthMeters, _baseGrid.StratumHeightMeters, _baseGrid.Columns, _baseGrid.Rows,
            _revision, _changes.Values.OrderBy(delta => delta.Revision).ToArray())
        {
            AppliedImpacts = _appliedImpacts.Select(pair =>
                    new WorldSiteStrataAppliedImpact(pair.Key, pair.Value))
                .OrderBy(entry => entry.RevisionAfter)
                .ThenBy(entry => entry.ImpactId, StringComparer.Ordinal)
                .ToArray(),
            Fractures = _fractures.Values.OrderBy(fracture => fracture.Revision).ToArray(),
        };
    }

    /// <summary>
    /// Restore a validated C# mutation snapshot against its exact immutable base site.
    /// Reject foreign seeds/sites, mismatched physical cell scale, duplicate cells,
    /// impossible integrity and corrupt revisions.
    /// </summary>
    public static WorldSiteStrataMutationState Restore(WorldSiteStrataGrid baseGrid,
        WorldSiteStrataMutationSave save)
    {
        ArgumentNullException.ThrowIfNull(baseGrid);
        ArgumentNullException.ThrowIfNull(save);
        if (save.Version is not (2 or 3 or CurrentVersion) ||
            save.WorldSeed != baseGrid.WorldSeed ||
            !string.Equals(save.SiteId, baseGrid.SiteId, StringComparison.Ordinal) ||
            save.CellWidthMeters != baseGrid.CellWidthMeters ||
            save.StratumHeightMeters != baseGrid.StratumHeightMeters ||
            save.Columns != baseGrid.Columns ||
            save.Rows != baseGrid.Rows ||
            save.Revision < 0 ||
            save.Changes is null || save.AppliedImpacts is null || save.Fractures is null ||
            (save.Version == 2 && save.AppliedImpacts.Count != 0) ||
            (save.Version < CurrentVersion && save.Fractures.Count != 0))
        {
            throw new ArgumentException("The mutation save does not match this C# world site.", nameof(save));
        }

        var state = new WorldSiteStrataMutationState(baseGrid);
        var revisions = new HashSet<long>();
        foreach (var delta in save.Changes)
        {
            if (delta is null ||
                delta.Revision <= 0 || delta.Revision > save.Revision ||
                !revisions.Add(delta.Revision) ||
                (delta.Kind == WorldSiteCellMutationKind.Damaged && delta.RemainingIntegrity <= 0) ||
                (delta.Kind == WorldSiteCellMutationKind.Removed && delta.RemainingIntegrity != 0) ||
                !Enum.IsDefined(delta.Kind))
            {
                throw new ArgumentException("The mutation save contains an invalid cell delta.", nameof(save));
            }

            var baseCell = baseGrid.GetCell(delta.Key.X, delta.Key.Y, delta.Key.Z);
            if (baseCell.IsEmpty || !baseCell.Solid || !state._changes.TryAdd(delta.Key, delta))
            {
                throw new ArgumentException("The mutation save contains an unknown or duplicate block.", nameof(save));
            }
        }

        if (save.Fractures.Count > 0 &&
            (baseGrid.CellWidthMeters != WorldSiteStrataGrid.BlockEdgeMeters ||
             baseGrid.StratumHeightMeters != WorldSiteStrataGrid.BlockEdgeMeters))
        {
            throw new ArgumentException("Fracture masks require physical 1m C# blocks.", nameof(save));
        }

        foreach (var fracture in save.Fractures)
        {
            if (fracture is null || fracture.Revision <= 0 ||
                fracture.Revision > save.Revision || !revisions.Add(fracture.Revision) ||
                fracture.Mask.IsEmpty ||
                state._changes.ContainsKey(fracture.Key))
            {
                throw new ArgumentException("The mutation save contains an invalid fracture.", nameof(save));
            }

            var baseCell = baseGrid.GetCell(fracture.Key.X, fracture.Key.Y, fracture.Key.Z);
            if (baseCell.IsEmpty || !baseCell.Solid ||
                !state._fractures.TryAdd(fracture.Key, fracture))
            {
                throw new ArgumentException("The mutation save contains an unknown or duplicate fracture.", nameof(save));
            }
        }

        if (revisions.Count > 0 && !revisions.Contains(save.Revision))
        {
            throw new ArgumentException("The mutation revision does not match its final block change.", nameof(save));
        }

        if (revisions.Count == 0 && save.Revision != 0)
        {
            throw new ArgumentException("An empty mutation save cannot carry a nonzero revision.", nameof(save));
        }

        foreach (var impact in save.AppliedImpacts)
        {
            if (impact is null || string.IsNullOrWhiteSpace(impact.ImpactId) ||
                impact.ImpactId.Length > 128 || impact.RevisionAfter < 0 ||
                impact.RevisionAfter > save.Revision ||
                !state._appliedImpacts.TryAdd(impact.ImpactId, impact.RevisionAfter))
            {
                throw new ArgumentException("The mutation save contains an invalid impact identity.", nameof(save));
            }
        }

        state._revision = save.Revision;
        return state;
    }

    private WorldSiteStrataCell GetRawCell(WorldSiteCellKey key)
    {
        var original = _baseGrid.GetCell(key.X, key.Y, key.Z);
        if ((_changes.TryGetValue(key, out var delta) &&
             delta.Kind == WorldSiteCellMutationKind.Removed) ||
            (_fractures.TryGetValue(key, out var fracture) && fracture.Mask.IsFullyExcavated))
        {
            return original with
            {
                BodyMaterial = null,
                SurfaceFinish = null,
                Solid = false,
            };
        }

        return original;
    }

    private void EnsurePhysicalFractureScale()
    {
        if (_baseGrid.CellWidthMeters != WorldSiteStrataGrid.BlockEdgeMeters ||
            _baseGrid.StratumHeightMeters != WorldSiteStrataGrid.BlockEdgeMeters)
        {
            throw new InvalidOperationException("12.5cm fracture cells require physical 1m XYZ blocks.");
        }
    }

    private static bool TryUnpackGlobalMicrocell(long global, out int cell, out int local)
    {
        var quotient = Math.DivRem(global, WorldSiteFractureGeometry.MicrocellsPerEdge,
            out var remainder);
        if (remainder < 0)
        {
            quotient--;
            remainder += WorldSiteFractureGeometry.MicrocellsPerEdge;
        }

        if (quotient < int.MinValue || quotient > int.MaxValue)
        {
            cell = 0;
            local = 0;
            return false;
        }

        cell = (int)quotient;
        local = (int)remainder;
        return true;
    }
}
