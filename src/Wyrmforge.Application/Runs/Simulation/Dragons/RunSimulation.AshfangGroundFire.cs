using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>Authoritative local fire: fuel sets burn time, and each fire has at most one bounded spread attempt.</summary>
internal sealed class AshfangGroundFirePatch(int id, Vector2D position, AshfangFireFuel fuel = AshfangFireFuel.DryOrganic, int generation = 0)
{
    public const double HotSeconds = 2.75;
    public const double VisibleSeconds = 9;
    public const double Radius = 34;
    private const double SpreadAfterSeconds = 0.7;
    private const int MaximumGeneration = 2;
    private bool spreadAttempted;

    public int Id { get; } = id;
    public Vector2D Position { get; } = position;
    public AshfangFireFuel Fuel { get; } = fuel;
    public int Generation { get; } = generation;
    public double AgeSeconds { get; private set; }
    public double HotLifetime => Fuel switch
    {
        AshfangFireFuel.DampOrganic => 1.15,
        AshfangFireFuel.Wood => 3.5,
        _ => HotSeconds,
    };
    public bool Burning => AgeSeconds < HotLifetime;
    public bool Expired => AgeSeconds >= VisibleSeconds;
    public bool ReadyToSpread => !spreadAttempted && Generation < MaximumGeneration && AshfangFireFuelRules.CanSpread(Fuel) &&
        Burning && AgeSeconds >= SpreadAfterSeconds;

    public void Advance(double delta)
    {
        if (delta > 0) AgeSeconds = Math.Min(VisibleSeconds, AgeSeconds + delta);
    }

    public void Rekindle() => AgeSeconds = 0;

    public void MarkSpreadAttempted() => spreadAttempted = true;

    public void Extinguish()
    {
        AgeSeconds = Math.Max(AgeSeconds, HotLifetime);
        spreadAttempted = true;
    }

    public bool Burns(Vector2D position) => Burning && Vector2D.Distance(Position, position) <= Radius;
}

public sealed partial class RunSimulation
{
    private const int MaxAshfangGroundFires = 24;
    private const double AshfangGroundFireHitIntervalSeconds = 0.5;
    private const double AshfangGroundFireDamage = 4;
    private const double MinimumFireSeparation = 20;
    private static readonly (int X, int Y)[] AshfangSpreadDirections = [(1, 0), (0, 1), (-1, 0), (0, -1)];
    private readonly List<AshfangGroundFirePatch> ashfangGroundFires = [];
    private int ashfangGroundFireSequence;
    private double ashfangGroundFireHitCooldown;

    private void RegisterAshfangGroundFire(Vector2D position)
    {
        if (!double.IsFinite(position.X) || !double.IsFinite(position.Y) ||
            position.X < 0 || position.Y < 0 || position.X > arenaWidth || position.Y > arenaHeight) return;

        // Breath still scratches stone and lava as before; it cannot leave persistent fuel there.
        var grid = arenaEnvironment?.Terrain;
        var fuel = grid is null ? AshfangFireFuel.DryOrganic : AshfangFireFuelRules.At(grid, position);
        if (fuel == AshfangFireFuel.Inert) return;

        // Repeat scorches rekindle existing fuel, without stacking damage, spread budgets or allocations.
        var existing = ashfangGroundFires.FirstOrDefault(patch =>
            Vector2D.Distance(patch.Position, position) <= AshfangGroundFirePatch.Radius * 0.5);
        if (existing is not null)
        {
            existing.Rekindle();
            return;
        }

        if (ashfangGroundFires.Count >= MaxAshfangGroundFires) ashfangGroundFires.RemoveAt(0);
        ashfangGroundFires.Add(new AshfangGroundFirePatch(++ashfangGroundFireSequence, position, fuel));
    }

    private void UpdateAshfangGroundFires(double delta)
    {
        if (delta <= 0) return;
        var grid = arenaEnvironment?.Terrain;
        foreach (var patch in ashfangGroundFires)
        {
            if (grid is not null && AshfangFireFuelRules.At(grid, patch.Position) == AshfangFireFuel.Inert) patch.Extinguish();
            patch.Advance(delta);
        }
        ashfangGroundFires.RemoveAll(patch => patch.Expired);
        if (grid is not null) SpreadAshfangGroundFires(grid);

        // One authoritative periodic contact test. Overlapping fires never add damage or bypass the hunter's guard.
        ashfangGroundFireHitCooldown = Math.Max(0, ashfangGroundFireHitCooldown - delta);
        if (!ashfangGroundFires.Any(patch => patch.Burns(player.Position)))
        {
            ashfangGroundFireHitCooldown = 0;
            return;
        }
        if (ashfangGroundFireHitCooldown > 0) return;
        DamagePlayer(AshfangGroundFireDamage * depthState.DragonDamageMultiplier);
        ashfangGroundFireHitCooldown = AshfangGroundFireHitIntervalSeconds;
    }

    private void SpreadAshfangGroundFires(ArenaTerrainGrid grid)
    {
        // Snapshot the eligible flames: children cannot grow again in the same tick.
        foreach (var source in ashfangGroundFires.Where(patch => patch.ReadyToSpread).ToArray())
        {
            source.MarkSpreadAttempted();
            if (ashfangGroundFires.Count >= MaxAshfangGroundFires) break;
            var (column, row) = ArenaTerrainGrid.ColumnOf(source.Position);
            var start = (source.Id + grid.FireMoistureSeed & 3);
            for (var turn = 0; turn < AshfangSpreadDirections.Length; turn++)
            {
                var (dx, dy) = AshfangSpreadDirections[(start + turn) % AshfangSpreadDirections.Length];
                var target = ArenaTerrainGrid.CenterOf(column + dx, row + dy);
                var fuel = AshfangFireFuelRules.At(grid, target);
                if (!AshfangFireFuelRules.CanSpread(fuel) ||
                    !AshfangFireFuelRules.CanCrossHeight(grid, source.Position, target, source.Fuel, fuel) ||
                    ashfangGroundFires.Any(patch => Vector2D.Distance(patch.Position, target) < MinimumFireSeparation)) continue;

                ashfangGroundFires.Add(new AshfangGroundFirePatch(++ashfangGroundFireSequence, target, fuel, source.Generation + 1));
                break; // One neighbour per flame, no chain > two generations.
            }
        }
    }

    private void ClearAshfangGroundFires()
    {
        ashfangGroundFires.Clear();
        ashfangGroundFireHitCooldown = 0;
    }

    private IReadOnlyList<AshfangGroundFireRenderSnapshot> CreateAshfangGroundFireSnapshots() => ashfangGroundFires
        .Select(patch => new AshfangGroundFireRenderSnapshot(
            patch.Id, patch.Position.X, patch.Position.Y, AshfangFireVisualHeight(patch),
            AshfangGroundFirePatch.Radius, patch.AgeSeconds, patch.Burning)
        {
            Fuel = patch.Fuel.ToString().ToLowerInvariant(),
            HotSeconds = patch.HotLifetime,
            VisibleSeconds = AshfangGroundFirePatch.VisibleSeconds,
        })
        .ToArray();

    private double AshfangFireVisualHeight(AshfangGroundFirePatch patch)
    {
        if (patch.Fuel != AshfangFireFuel.Wood || arenaEnvironment?.Terrain is not { } grid) return GroundUnitsAt(patch.Position);
        // Trees are tall WOOD columns in the heightfield. Show their flames on the trunk, not floating above its crown.
        var (column, row) = ArenaTerrainGrid.ColumnOf(patch.Position);
        return grid.Contains(column, row)
            ? Math.Max(0, grid.Surface(column, row) - ArenaTerrainGrid.SoilDepthMicrocells * 2) * ArenaTerrainGrid.MicrocellUnits
            : 0;
    }
}
