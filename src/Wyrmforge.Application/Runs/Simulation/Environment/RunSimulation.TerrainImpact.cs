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

    // Fireball progression is visible in the terrain: rank I leaves a small chip, II-III
    // carve shallow craters, IV digs deeper and V can break into stone. Mutators enhance
    // excavation, but never exceed the bedrock-safe power-five profile.
    private int FireballTerrainPower(ProjectileState projectile)
    {
        var power = ArenaTerrainMutation.FireballPowerForRank(projectile.Rank);
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

    /// <summary>Splits the ground at a point with a cleft of the given reach in microcells; the same point always splits the same way.</summary>
    private void ApplyTerrainFissure(Vector2D at, int reachMicrocells)
    {
        if (arenaEnvironment?.Terrain is null) return;
        var seed = unchecked((long)Math.Round(at.X * 4) * 73856093L ^ (long)Math.Round(at.Y * 4) * 19349663L);
        ArenaTerrainImpact impact = new(++nextTerrainImpactId, at, 1) { FissureReach = reachMicrocells, FissureSeed = seed };
        terrainChangesThisTick.AddRange(arenaEnvironment.ApplyTerrainImpact(impact, player.Position, player.Radius, arenaWidth, arenaHeight));
    }

    // One field ambush creates many simultaneous cracks. Validate them together to avoid a full path search per mark.
    private void ApplyTerrainFissures(IEnumerable<Vector2D> positions, int reachMicrocells)
    {
        if (arenaEnvironment?.Terrain is null) return;
        var impacts = positions.Select(at =>
        {
            var seed = unchecked((long)Math.Round(at.X * 4) * 73856093L ^ (long)Math.Round(at.Y * 4) * 19349663L);
            return new ArenaTerrainImpact(++nextTerrainImpactId, at, 1) { FissureReach = reachMicrocells, FissureSeed = seed };
        }).ToArray();
        terrainChangesThisTick.AddRange(arenaEnvironment.ApplyTerrainImpacts(impacts, player.Position, player.Radius, arenaWidth, arenaHeight));
    }

    private void EnemyTerrainBlasts(IEnumerable<Vector2D> positions)
    {
        if (arenaEnvironment?.Terrain is null) return;
        var impacts = positions.Select(at => new ArenaTerrainImpact(++nextTerrainImpactId, at, 1)).ToArray();
        terrainChangesThisTick.AddRange(arenaEnvironment.ApplyTerrainImpacts(impacts, player.Position, player.Radius, arenaWidth, arenaHeight));
    }

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
