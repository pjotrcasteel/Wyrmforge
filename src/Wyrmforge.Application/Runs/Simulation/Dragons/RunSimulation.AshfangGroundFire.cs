using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>A physical Ashfang breath scar: hot briefly, then a harmless fading mark. C# owns its damage and lifetime.</summary>
internal sealed class AshfangGroundFirePatch(int id, Vector2D position)
{
    public const double HotSeconds = 2.75;
    public const double VisibleSeconds = 6;
    public const double Radius = 34;

    public int Id { get; } = id;
    public Vector2D Position { get; } = position;
    public double AgeSeconds { get; private set; }
    public bool Burning => AgeSeconds < HotSeconds;
    public bool Expired => AgeSeconds >= VisibleSeconds;

    public void Advance(double delta)
    {
        if (delta > 0) AgeSeconds = Math.Min(VisibleSeconds, AgeSeconds + delta);
    }

    public void Rekindle() => AgeSeconds = 0;

    public bool Burns(Vector2D position) => Burning && Vector2D.Distance(Position, position) <= Radius;
}

public sealed partial class RunSimulation
{
    private const int MaxAshfangGroundFires = 24;
    private const double AshfangGroundFireHitIntervalSeconds = 0.5;
    private const double AshfangGroundFireDamage = 4;
    private readonly List<AshfangGroundFirePatch> ashfangGroundFires = [];
    private int ashfangGroundFireSequence;
    private double ashfangGroundFireHitCooldown;

    private void RegisterAshfangGroundFire(Vector2D position)
    {
        if (!double.IsFinite(position.X) || !double.IsFinite(position.Y) ||
            position.X < 0 || position.Y < 0 || position.X > arenaWidth || position.Y > arenaHeight) return;

        // One visual/physical patch per scorched spot. Repeated breaths rekindle it rather than stacking damage or allocations.
        var existing = ashfangGroundFires.FirstOrDefault(patch =>
            Vector2D.Distance(patch.Position, position) <= AshfangGroundFirePatch.Radius * 0.5);
        if (existing is not null)
        {
            existing.Rekindle();
            return;
        }

        if (ashfangGroundFires.Count >= MaxAshfangGroundFires) ashfangGroundFires.RemoveAt(0);
        ashfangGroundFires.Add(new AshfangGroundFirePatch(++ashfangGroundFireSequence, position));
    }

    private void UpdateAshfangGroundFires(double delta)
    {
        if (delta <= 0) return;
        foreach (var patch in ashfangGroundFires) patch.Advance(delta);
        ashfangGroundFires.RemoveAll(patch => patch.Expired);

        // A single authoritative periodic contact check, regardless of how many fire patches overlap.
        // The normal player damage guard applies; this cannot eclipse a stronger simultaneous boss strike.
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

    private void ClearAshfangGroundFires()
    {
        ashfangGroundFires.Clear();
        ashfangGroundFireHitCooldown = 0;
    }

    private IReadOnlyList<AshfangGroundFireRenderSnapshot> CreateAshfangGroundFireSnapshots() => ashfangGroundFires
        .Select(patch => new AshfangGroundFireRenderSnapshot(
            patch.Id, patch.Position.X, patch.Position.Y, GroundUnitsAt(patch.Position),
            AshfangGroundFirePatch.Radius, patch.AgeSeconds, patch.Burning))
        .ToArray();
}
