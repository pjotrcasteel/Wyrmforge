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

    // Every confirmed Fireball contact chips the ground; heavier Fireballs dig deeper. A shot that stopped at a wall or cliff face
    // (it was flying above the ground it started over and met taller rock) bites the face from the side instead of the ground from above.
    private void ApplyFireballTerrainImpact(Vector2D at, ProjectileState projectile, Vector2D? from = null)
    {
        if (arenaEnvironment?.Terrain is not { } grid || projectile.Spell != SpellId.FireBolt) return;
        var power = HasFireballMutation(FireballMutationId.MeteorHeart) ? 3 : projectile.SplashRadius > 0 ? 2 : 1;
        ArenaTerrainImpact impact = new(++nextTerrainImpactId, at, power);
        if (from is { } origin && (at - origin) is { Length: > 1e-9 } travel && grid.FaceHitHeight(origin, at, travel.Normalized()) is { } height)
            impact = impact with { Direction = travel.Normalized(), FaceHeight = height };
        var changes = arenaEnvironment.ApplyTerrainImpact(impact, player.Position, player.Radius, arenaWidth, arenaHeight);
        terrainChangesThisTick.AddRange(changes);
    }
}
