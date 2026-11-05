using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    /// <summary>Terrain for presentation when it differs from the revision the caller already holds; null otherwise.</summary>
    public Wyrmforge.Application.Runs.Simulation.Snapshots.ArenaTerrainFrame? TerrainFrame(int knownRevision) =>
        arenaEnvironment?.Terrain is { } grid && grid.Revision != knownRevision ? grid.ToFrame(knownRevision) : null;

    private long nextTerrainImpactId;

    /// <summary>Ground height in world units under a point; the oblique screen offset is applied by presentation.</summary>
    private double GroundUnitsAt(Vector2D position) => arenaEnvironment?.GroundMetersAt(position, arenaWidth, arenaHeight) is { } meters
        ? meters * ArenaMetricEnvelope.UnitsPerMeter : 0;

    /// <summary>Terrain columns changed in the latest tick, for presentation, audio and navigation consumers.</summary>
    public IReadOnlyList<ArenaTerrainChange> TerrainChangesThisTick => terrainChangesThisTick;
    private readonly List<ArenaTerrainChange> terrainChangesThisTick = [];

    // Terrain power of a Fireball follows its tier and mutators, so a plain tier-1 bolt only scratches the ground while a maxed,
    // mutated one carves it: rank 1-5 gives power 1, 1, 2, 2, 3; Detonation adds 1 and Meteor Heart adds 2 (power is clamped to 1-5).
    private int FireballTerrainPower(ProjectileState projectile)
    {
        var power = (Math.Clamp(projectile.Rank, 1, 5) + 1) / 2;
        if (HasFireballMutation(FireballMutationId.Detonation)) power += 1;
        if (HasFireballMutation(FireballMutationId.MeteorHeart)) power += 2;
        return Math.Clamp(power, 1, 5);
    }

    // Every confirmed Fireball contact chips the ground. A shot that stopped at a wall or cliff face
    // (it was flying above the ground it started over and met taller rock) bites the face from the side instead of the ground from above.
    private void ApplyFireballTerrainImpact(Vector2D at, ProjectileState projectile, Vector2D? from = null)
    {
        if (projectile.Spell != SpellId.FireBolt) return;
        ApplyTerrainBlast(at, FireballTerrainPower(projectile), from);
    }

    /// <summary>Magic thrown by enemies and Wyrms breaks the ground by the same rule as the hunter's: power 1 scratches, 2 digs, 3 and up carve.</summary>
    private void EnemyTerrainBlast(Vector2D at, int power) => ApplyTerrainBlast(at, power, null);

    private void ApplyTerrainBlast(Vector2D at, int power, Vector2D? from)
    {
        if (arenaEnvironment?.Terrain is not { } grid) return;
        ArenaTerrainImpact impact = new(++nextTerrainImpactId, at, power);
        if (from is { } origin && (at - origin) is { Length: > 1e-9 } travel && grid.FaceHitHeight(origin, at, travel.Normalized()) is { } height)
            impact = impact with { Direction = travel.Normalized(), FaceHeight = height };
        var changes = arenaEnvironment.ApplyTerrainImpact(impact, player.Position, player.Radius, arenaWidth, arenaHeight);
        terrainChangesThisTick.AddRange(changes);
    }
}
