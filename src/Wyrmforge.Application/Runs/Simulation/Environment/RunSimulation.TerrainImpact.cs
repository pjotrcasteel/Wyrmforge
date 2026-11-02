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

    // Every confirmed Fireball contact chips the ground; heavier Fireballs dig deeper.
    private void ApplyFireballTerrainImpact(Vector2D at, ProjectileState projectile)
    {
        if (arenaEnvironment?.Terrain is null || projectile.Spell != SpellId.FireBolt) return;
        var power = HasFireballMutation(FireballMutationId.MeteorHeart) ? 3 : projectile.SplashRadius > 0 ? 2 : 1;
        var changes = arenaEnvironment.ApplyTerrainImpact(new ArenaTerrainImpact(++nextTerrainImpactId, at, power),
            player.Position, player.Radius, arenaWidth, arenaHeight);
        terrainChangesThisTick.AddRange(changes);
    }
}
