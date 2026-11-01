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
/// A versioned, seed/site/grid-scale-scoped snapshot of changes, not a serialized 3D world or JS state.
/// Prototype schema v2 prevents applying tombstones to a later resized XY/Z physical grid.
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
    IReadOnlyList<WorldSiteCellDelta> Changes);

/// <summary>
/// XYZ1 foundation: sparse, replayable damage/removal over the existing read-only AR3 geology.
/// This does not connect to Hunt collision, Fireball, navigation, rewards or save slots yet.
/// Only the existing C# simulation may eventually own such an integration.
/// </summary>
public sealed class WorldSiteStrataMutationState
{
    public const int CurrentVersion = 2;

    private readonly WorldSiteStrataGrid _baseGrid;
    private readonly Dictionary<WorldSiteCellKey, WorldSiteCellDelta> _changes = [];
    private long _revision;

    public long Revision => _revision;
    public int ChangedCellCount => _changes.Count;
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
        while (_changes.TryGetValue(key, out var delta) &&
               delta.Kind == WorldSiteCellMutationKind.Removed)
        {
            key = key with { Z = checked(key.Z - 1) };
        }

        return GetCell(key);
    }

    /// <summary>Return the change, if any. Null specifically means the seeded base is unchanged.</summary>
    public WorldSiteCellDelta? FindDelta(WorldSiteCellKey key)
    {
        return _changes.TryGetValue(key, out var delta) ? delta : null;
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
        if (baseCell.IsEmpty || !baseCell.Solid)
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
        if (string.IsNullOrWhiteSpace(impact.ImpactId))
        {
            throw new ArgumentException("An impact must have a caller-owned identity.", nameof(impact));
        }

        // Bound the area to 33x33 candidate columns, independent of seed or device.
        if (impact.RadiusCells is < 0 or > 16 || impact.PeakDamage <= 0 ||
            impact.SoilIntegrity <= 0 || impact.RockIntegrity <= 0 || impact.OtherIntegrity <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(impact));
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

        return new WorldSiteStrataImpactResult(impact.ImpactId, impact.CenterX, impact.CenterY,
            impact.RadiusCells, revisionBefore, _revision, changes);
    }

    /// <summary>Capture a stable, ordered copy of only changed cells, suitable for C# save/replay.</summary>
    public WorldSiteStrataMutationSave CaptureSave()
    {
        return new WorldSiteStrataMutationSave(CurrentVersion, _baseGrid.WorldSeed, _baseGrid.SiteId,
            _baseGrid.CellWidthMeters, _baseGrid.StratumHeightMeters, _baseGrid.Columns, _baseGrid.Rows,
            _revision, _changes.Values.OrderBy(delta => delta.Revision).ToArray());
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
        if (save.Version != CurrentVersion ||
            save.WorldSeed != baseGrid.WorldSeed ||
            !string.Equals(save.SiteId, baseGrid.SiteId, StringComparison.Ordinal) ||
            save.CellWidthMeters != baseGrid.CellWidthMeters ||
            save.StratumHeightMeters != baseGrid.StratumHeightMeters ||
            save.Columns != baseGrid.Columns ||
            save.Rows != baseGrid.Rows ||
            save.Revision < 0 ||
            save.Changes is null)
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

        if (save.Changes.Count > 0 && !revisions.Contains(save.Revision))
        {
            throw new ArgumentException("The mutation revision does not match its final block change.", nameof(save));
        }

        if (save.Changes.Count == 0 && save.Revision != 0)
        {
            throw new ArgumentException("An empty mutation save cannot carry a nonzero revision.", nameof(save));
        }

        state._revision = save.Revision;
        return state;
    }

    private WorldSiteStrataCell GetRawCell(WorldSiteCellKey key)
    {
        var original = _baseGrid.GetCell(key.X, key.Y, key.Z);
        if (_changes.TryGetValue(key, out var delta) &&
            delta.Kind == WorldSiteCellMutationKind.Removed)
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
}
